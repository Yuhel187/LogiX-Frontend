import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, authFetch } from "@/lib/api";
import { resolveLocaleMessage } from "@/lib/i18n";
import {
  createDriverApi,
  getDriverApi,
  listDriversApi,
  listEligibleDriverUsersApi,
  setDriverStatusApi,
  updateDriverApi,
  previewDriverRelinkApi,
  relinkDriverUserApi,
} from "./drivers.api";
import { resolveDriverErrorMessage } from "../utils/driver-error-message";

vi.mock("@/lib/config", () => ({
  apiBaseUrl: "https://gateway.example/api/v1",
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, authFetch: vi.fn() };
});

const apiFetch = vi.mocked(authFetch);
const baseUrl = "https://gateway.example/api/v1/drivers";

const driver = {
  id: "driver-1",
  tenantId: "tenant-1",
  code: "DRV-001",
  userId: "member-1",
  displayName: "Nguyen Van A",
  licenseNumber: "LIC-001",
  licenseExpiry: "2028-02-29",
  phone: null,
  status: "ACTIVE",
  version: 4,
  createdAt: "2026-10-25T00:00:00.000Z",
  updatedAt: "2026-10-25T00:00:00.000Z",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Driver feature API adapters", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("serializes list filters and parses the Gateway page response", async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({ items: [driver], page: 2, pageSize: 10, total: 11 })
    );

    await expect(
      listDriversApi({ q: "LIC/1", status: "ACTIVE", page: 2, pageSize: 10 })
    ).resolves.toMatchObject({ items: [driver], page: 2, pageSize: 10, total: 11 });
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}?q=LIC%2F1&status=ACTIVE&page=2&pageSize=10`,
      { method: "GET" }
    );
  });

  it("loads a Driver detail using an encoded id", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(driver));
    await expect(getDriverApi("driver/id")).resolves.toEqual(driver);
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/driver%2Fid`, {
      method: "GET",
    });
  });

  it("loads Drivers beyond the first 100 and preserves server pagination totals", async () => {
      apiFetch.mockResolvedValueOnce(
        jsonResponse({ items: [driver], page: 6, pageSize: 20, total: 121 })
      );
      await expect(
        listDriversApi({ page: 6, pageSize: 20 })
      ).resolves.toMatchObject({ items: [driver], page: 6, total: 121 });
      expect(apiFetch).toHaveBeenCalledWith(
        `${baseUrl}?page=6&pageSize=20`,
        { method: "GET" }
      );
    });

  it("resolves Driver picker pagination copy in both locales", () => {
      for (const locale of ["vi", "en"] as const) {
        for (const key of ["driverPagination", "driverPageSummary"]) {
          const path = `transport.driver.${key}`;
          expect(resolveLocaleMessage(locale, path)).not.toBe(path);
        }
      }
  });

  it("creates a Driver with the accepted fields and omits blank optionals", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(driver));
    await createDriverApi({
      code: "DRV-001",
      userId: "member-1",
      licenseNumber: "LIC-001",
      licenseExpiry: "2028-02-29",
      phone: "",
    });
    expect(apiFetch).toHaveBeenCalledWith(baseUrl, {
      method: "POST",
      body: JSON.stringify({
        code: "DRV-001",
        userId: "member-1",
        licenseNumber: "LIC-001",
        licenseExpiry: "2028-02-29",
      }),
    });
  });

  it("updates only mutable fields and transmits null when clearing phone", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(driver));
    await updateDriverApi("driver-1", {
      version: 4,
      licenseNumber: "LIC-002",
      phone: null,
    });
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/driver-1`, {
      method: "PATCH",
      body: JSON.stringify({
        version: 4,
        licenseNumber: "LIC-002",
        phone: null,
      }),
    });
  });

  it("omits blank code on creation and preserves the server-generated code", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({ ...driver, code: "DRV-000001" }));
    const result = await createDriverApi({
      code: "   ", userId: "member-1", licenseNumber: "LIC-001", licenseExpiry: "2028-02-29",
    });
    expect(result.code).toBe("DRV-000001");
    const body = apiFetch.mock.calls[0][1]?.body;
    expect(typeof body).toBe("string");
    if (typeof body !== "string") throw new Error("Expected JSON request body");
    expect(JSON.parse(body)).not.toHaveProperty("code");
  });

  it("sends code edits with the optimistic version and does not clear blank codes", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({ ...driver, code: "MY-DRIVER" }));
    await updateDriverApi(driver.id, { version: 4, code: " MY-DRIVER " });
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/${driver.id}`, {
      method: "PATCH", body: JSON.stringify({ version: 4, code: "MY-DRIVER" }),
    });
    apiFetch.mockClear();
    await expect(updateDriverApi(driver.id, { version: 4, code: " " })).rejects.toThrow();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it.each(["enable", "disable"] as const)(
    "sends the optimistic version for %s",
    async (action) => {
      apiFetch.mockResolvedValueOnce(jsonResponse(driver));
      await setDriverStatusApi("driver-1", action, 7);
      expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/driver-1/${action}`, {
        method: "POST",
        body: JSON.stringify({ version: 7 }),
      });
    }
  );

  it("uses the Identity eligibility endpoint with its independent page query", async () => {
    const response = {
      items: [
        {
          id: "member-1",
          displayName: "Nguyen Van A",
          email: "driver@example.test",
          status: "ACTIVE",
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    };
    apiFetch.mockResolvedValueOnce(jsonResponse(response));

    await expect(
      listEligibleDriverUsersApi({ q: "Nguyen A", page: 1, pageSize: 20 })
    ).resolves.toEqual(response);
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}/eligible-users?q=Nguyen+A&page=1&pageSize=20`,
      { method: "GET" }
    );
  });

  it("normalizes a typed conflict without exposing backend language", async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          statusCode: 409,
          error: "Conflict",
          message: "Version conflict in backend service",
          details: { code: "CONCURRENCY_CONFLICT" },
        },
        409
      )
    );

    const failure = await setDriverStatusApi("driver-1", "disable", 4).catch(
      (error: unknown) => error
    );
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).code).toBe("CONCURRENCY_CONFLICT");
    expect(resolveDriverErrorMessage(failure, (key) =>
      resolveLocaleMessage("en", key)
    )).toBe(resolveLocaleMessage("en", "masterData.driver.errors.conflict"));
  });

  it("maps the shared top-level error envelope by HTTP status", async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          statusCode: 409,
          error: "Conflict",
          message: "Version conflict in backend service",
          details: { code: "CONCURRENCY_CONFLICT" },
          timestamp: "2026-10-25T00:00:00.000Z",
        },
        409
      )
    );

    const failure = await updateDriverApi("driver-1", {
      version: 4,
      licenseNumber: "LIC-002",
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).code).toBe("CONCURRENCY_CONFLICT");
    expect((failure as ApiError).message).toBe(
      "Version conflict in backend service"
    );
    expect(
      resolveDriverErrorMessage(failure, (key) =>
        resolveLocaleMessage("en", key)
      )
    ).toBe(resolveLocaleMessage("en", "masterData.driver.errors.conflict"));
  });

  it("does not retry or claim success when a mutation response is lost", async () => {
    apiFetch.mockRejectedValueOnce(new TypeError("connection was lost"));
    await expect(
      createDriverApi({
        code: "DRV-001",
        userId: "member-1",
        licenseNumber: "LIC-001",
        licenseExpiry: "2028-02-29",
      })
    ).rejects.toThrow("connection was lost");
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  const relinkInput = {
    version: 4,
    expectedUserId: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    reason: "  Correct mistaken link  ",
  };
  const relinkPreview = {
    driverId: "33333333-3333-4333-8333-333333333333",
    version: 4,
    previousUserId: relinkInput.expectedUserId,
    userId: relinkInput.userId,
    previousDisplayName: "Previous member",
    displayName: "Replacement member",
    reason: "Correct mistaken link",
  };

  it("posts preview with the chosen contract, trims reason and pins the original session", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(relinkPreview));
    await expect(previewDriverRelinkApi("driver/id", relinkInput, "original-token"))
      .resolves.toEqual(relinkPreview);
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith(
      `${baseUrl}/driver%2Fid/relink-user/preview`,
      {
        method: "POST",
        body: JSON.stringify({ ...relinkInput, reason: "Correct mistaken link" }),
        accessToken: "original-token",
        skipAuthRefresh: true,
      }
    );
  });

  it("posts confirmation separately and validates the normal Driver view", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(driver));
    await expect(relinkDriverUserApi("driver/id", relinkInput, "original-token"))
      .resolves.toEqual(driver);
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith(
      `${baseUrl}/driver%2Fid/relink-user`,
      {
        method: "POST",
        body: JSON.stringify({ ...relinkInput, reason: "Correct mistaken link" }),
        accessToken: "original-token",
        skipAuthRefresh: true,
      }
    );
  });

  it.each([previewDriverRelinkApi, relinkDriverUserApi])(
    "rejects invalid outgoing data before sending the relink request",
    async (operation) => {
      await expect(operation("driver-1", { ...relinkInput, reason: "  " }, "token"))
        .rejects.toThrow();
      expect(apiFetch).not.toHaveBeenCalled();
    }
  );

  it.each([previewDriverRelinkApi, relinkDriverUserApi])(
    "rejects malformed successful relink responses without a success fallback",
    async (operation) => {
      apiFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await expect(operation("driver-1", relinkInput, "token")).rejects.toThrow();
      expect(apiFetch).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    [409, "DRIVER_LINK_LOCKED", "masterData.driver.errors.linkLocked"],
    [400, "DRIVER_LINK_UNCHANGED", "masterData.driver.validation.differentUser"],
    [409, "CONCURRENCY_CONFLICT", "masterData.driver.errors.conflict"],
    [409, "CONFLICT", "masterData.driver.errors.conflict"],
  ])("localizes standard top-level relink envelope %s/%s", async (status, code, key) => {
    apiFetch.mockResolvedValueOnce(jsonResponse({
      statusCode: status, error: "Conflict", message: "private backend detail",
      details: { code }, timestamp: "2026-10-25T00:00:00.000Z",
    }, Number(status)));
    const failure = await relinkDriverUserApi("driver-1", relinkInput, "token")
      .catch((cause: unknown) => cause);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).code).toBe(code);
    for (const locale of ["en", "vi"] as const) {
      const message = resolveDriverErrorMessage(
        failure, (path) => resolveLocaleMessage(locale, path), "mutation"
      );
      expect(message).toBe(resolveLocaleMessage(locale, String(key)));
      expect(message).not.toContain("private backend detail");
    }
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
