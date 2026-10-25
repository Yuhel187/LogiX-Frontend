import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { resolveLocaleMessage } from "@/lib/i18n";
import { previewDriverRelinkApi, relinkDriverUserApi } from "../../api/drivers.api";
import type { Driver, RelinkDriverUserInput } from "../../schemas/driver.schema";
import {
  prepareDriverRelink, confirmDriverRelink, type DriverRelinkContext,
} from "./driver-relink-workflow";
import { DriverRelinkDialog, DriverRelinkReview } from "./driver-relink-dialog";

const auth = vi.hoisted(() => ({
  manage: true,
  tenantId: "tenant-1" as string | null,
  token: "origin-token" as string | null,
  transition: "idle",
  locale: "en" as "en" | "vi",
}));

vi.mock("../../api/drivers.api", () => ({
  previewDriverRelinkApi: vi.fn(),
  relinkDriverUserApi: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    activeTenant: auth.tenantId ? { id: auth.tenantId } : null,
    accessToken: auth.token,
    tenantTransition: auth.transition,
    hasPermission: () => auth.manage,
  }),
}));
vi.mock("@/lib/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => actual.resolveLocaleMessage(auth.locale, key),
    }),
  };
});

const previousUserId = "11111111-1111-4111-8111-111111111111";
const replacementId = "22222222-2222-4222-8222-222222222222";
const driver: Driver = {
  id: "33333333-3333-4333-8333-333333333333",
  tenantId: "tenant-1",
  userId: previousUserId,
  displayName: "Cached old name",
  version: 4,
  code: "DRV-1",
  licenseNumber: "LIC-1",
  licenseExpiry: "2028-02-29",
  phone: null,
  status: "ACTIVE",
  createdAt: "",
  updatedAt: "",
};
const input: RelinkDriverUserInput = {
  version: 4,
  expectedUserId: previousUserId,
  userId: replacementId,
  reason: "  Correct mistaken selection  ",
};
const preview = {
  driverId: driver.id,
  version: 4,
  previousUserId,
  userId: replacementId,
  previousDisplayName: "Current old name <old>",
  displayName: "Replacement <new>",
  reason: "Correct mistaken selection",
};
const getContext = (): DriverRelinkContext => ({
  tenantId: auth.tenantId,
  accessToken: auth.token,
  canManage: auth.manage,
  tenantTransition: auth.transition,
});

describe("Driver account correction preview/confirm workflow (nonbrowser)", () => {
  beforeEach(() => {
    vi.mocked(previewDriverRelinkApi).mockReset().mockResolvedValue({ ...preview });
    vi.mocked(relinkDriverUserApi).mockReset().mockResolvedValue({
      ...driver, userId: replacementId, version: 5,
    });
    Object.assign(auth, {
      manage: true, tenantId: "tenant-1", token: "origin-token",
      transition: "idle", locale: "en",
    });
  });

  it("does not mutate at preview and confirms exactly the frozen trimmed body", async () => {
    const mutableInput = { ...input };
    const snapshot = await prepareDriverRelink(driver, mutableInput, getContext);
    expect(previewDriverRelinkApi).toHaveBeenCalledWith(
      driver.id, { ...input, reason: preview.reason }, "origin-token"
    );
    expect(relinkDriverUserApi).not.toHaveBeenCalled();
    mutableInput.userId = previousUserId;
    mutableInput.reason = "Different reason after preview";
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.body)).toBe(true);
    expect(Object.isFrozen(snapshot.preview)).toBe(true);
    await expect(confirmDriverRelink(snapshot, getContext)).resolves.toMatchObject({
      userId: replacementId, version: 5,
    });
    expect(relinkDriverUserApi).toHaveBeenCalledExactlyOnceWith(
      driver.id, snapshot.body, "origin-token"
    );
    expect(snapshot.body).toEqual({ ...input, reason: preview.reason });
  });

  it.each(["driverId", "version", "previousUserId", "userId", "reason"] as const)(
    "rejects a backend preview with mismatched %s instead of confirming",
    async (key) => {
      vi.mocked(previewDriverRelinkApi).mockResolvedValueOnce({
        ...preview,
        [key]: key === "version" ? 5 : "mismatch",
      });
      await expect(prepareDriverRelink(driver, input, getContext))
        .rejects.toMatchObject({ code: "INVALID_RESPONSE" });
      expect(relinkDriverUserApi).not.toHaveBeenCalled();
    }
  );

  it.each(["permission", "tenant", "session", "switching", "unknown"] as const)(
    "blocks preview and confirmation when %s context changes",
    async (change) => {
      const snapshot = await prepareDriverRelink(driver, input, getContext);
      if (change === "permission") auth.manage = false;
      if (change === "tenant") auth.tenantId = "tenant-2";
      if (change === "session") auth.token = "new-org-token";
      if (change === "switching") auth.transition = "switching";
      if (change === "unknown") auth.tenantId = null;
      await expect(confirmDriverRelink(snapshot, getContext))
        .rejects.toMatchObject({ code: "CONTEXT_UNKNOWN" });
      expect(relinkDriverUserApi).not.toHaveBeenCalled();
      if (change !== "session") {
        vi.mocked(previewDriverRelinkApi).mockClear();
        await expect(prepareDriverRelink(driver, input, getContext))
          .rejects.toMatchObject({ code: "CONTEXT_UNKNOWN" });
        expect(previewDriverRelinkApi).not.toHaveBeenCalled();
      }
    }
  );

  it("discards a preview that returns after switching organizations", async () => {
    vi.mocked(previewDriverRelinkApi).mockImplementationOnce(async () => {
      auth.tenantId = "tenant-2";
      return preview;
    });
    await expect(prepareDriverRelink(driver, input, getContext))
      .rejects.toMatchObject({ code: "CONTEXT_UNKNOWN" });
    expect(relinkDriverUserApi).not.toHaveBeenCalled();
  });

  it.each(["DRIVER_LINK_LOCKED", "DRIVER_LINK_UNCHANGED", "CONCURRENCY_CONFLICT"])(
    "propagates %s without a bypass or mutation fallback",
    async (code) => {
      vi.mocked(previewDriverRelinkApi).mockRejectedValueOnce(
        new ApiError(409, "private backend detail", code)
      );
      await expect(prepareDriverRelink(driver, input, getContext))
        .rejects.toMatchObject({ code });
      expect(relinkDriverUserApi).not.toHaveBeenCalled();
    }
  );

  it.each(["CONCURRENCY_CONFLICT", "CONFLICT", "DRIVER_LINK_LOCKED", "NETWORK_ERROR"])(
    "does not retry or report success after confirm failure %s", async (code) => {
      const snapshot = await prepareDriverRelink(driver, input, getContext);
      vi.mocked(relinkDriverUserApi).mockRejectedValueOnce(
        new ApiError(code === "NETWORK_ERROR" ? 0 : 409, "private detail", code)
      );
      await expect(confirmDriverRelink(snapshot, getContext)).rejects.toMatchObject({ code });
      expect(relinkDriverUserApi).toHaveBeenCalledTimes(1);
      expect(previewDriverRelinkApi).toHaveBeenCalledTimes(1);
    }
  );

  it.each(["en", "vi"] as const)(
    "renders backend old → new identity and reason, escaped and localized in %s",
    async (locale) => {
      auth.locale = locale;
      const snapshot = await prepareDriverRelink(driver, input, getContext);
      const html = renderToStaticMarkup(<DriverRelinkReview snapshot={snapshot} />);
      expect(html).toContain("Current old name &lt;old&gt;");
      expect(html).toContain("Replacement &lt;new&gt;");
      expect(html.indexOf(previousUserId)).toBeLessThan(html.indexOf(replacementId));
      expect(html).toContain(preview.reason);
      expect(html).toContain(resolveLocaleMessage(locale, "masterData.driver.relink.previous"));
      expect(html).not.toContain("Cached old name");
      expect(html).not.toContain("masterData.driver.");
    }
  );

  it.each(["permission", "tenant", "session", "switching"])(
    "renders no correction dialog for unavailable %s context", (missing) => {
      if (missing === "permission") auth.manage = false;
      if (missing === "tenant") auth.tenantId = "tenant-2";
      if (missing === "session") auth.token = null;
      if (missing === "switching") auth.transition = "switching";
      expect(renderToStaticMarkup(
        <DriverRelinkDialog driver={driver} onClose={vi.fn()} onSaved={vi.fn()} />
      )).toBe("");
      expect(previewDriverRelinkApi).not.toHaveBeenCalled();
      expect(relinkDriverUserApi).not.toHaveBeenCalled();
    }
  );
});
