import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { resolveLocaleMessage } from "@/lib/i18n";
import { TripAssignmentSummary } from "./trip-detail-screen";

let locale = "en";
vi.mock("@/lib/config", () => ({ apiBaseUrl: "https://gateway.example/api/v1" }));
vi.mock("@/lib/i18n", async (original) => {
  const actual = await original<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useTranslation: () => ({
      locale,
      t: (key: string, params?: Record<string, string | number>) =>
        actual.resolveLocaleMessage(locale, key, params),
    }),
  };
});

const vehicleId = "00000000-0000-4000-8000-000000000001";
const driverId = "00000000-0000-4000-8000-000000000002";

describe("Frozen trip assignment labels", () => {
  it.each(["vi", "en"])("renders plate and Driver name without UUIDs in %s", (language) => {
    locale = language;
    const html = renderToStaticMarkup(<TripAssignmentSummary trip={{
      vehicleId,
      driverId,
      vehicleSnapshot: { licensePlate: "51C-12345", code: "VEH-01" },
      driverSnapshot: { displayName: "Stored Driver", code: "DRV-01" },
    }} />);
    expect(html).toContain("51C-12345");
    expect(html).toContain("Stored Driver");
    expect(html).not.toContain(vehicleId);
    expect(html).not.toContain(driverId);
    expect(html).not.toContain("transport.");
  });

  it.each(["vi", "en"])("does not fall back to IDs when snapshot labels are absent in %s", (language) => {
    locale = language;
    const html = renderToStaticMarkup(<TripAssignmentSummary trip={{
      vehicleId, driverId, vehicleSnapshot: null, driverSnapshot: null,
    }} />);
    expect(html).toContain(resolveLocaleMessage(locale, "displayLabels.unavailable"));
    expect(html).not.toContain(vehicleId);
    expect(html).not.toContain(driverId);
    expect(html).not.toContain(resolveLocaleMessage(locale, "transport.fields.unassigned"));
  });

  it("distinguishes an unassigned resource from a missing snapshot", () => {
    locale = "en";
    const html = renderToStaticMarkup(<TripAssignmentSummary trip={{
      vehicleId: null, driverId: null,
    }} />);
    expect(html).toContain(resolveLocaleMessage(locale, "transport.fields.unassigned"));
    expect(html).not.toContain(resolveLocaleMessage(locale, "displayLabels.unavailable"));
  });
});
