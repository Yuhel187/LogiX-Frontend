import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { resolveLocaleMessage } from "@/lib/i18n";
import { tripDetailSchema } from "../schemas/trip.schema";
import { TripRoutePanel } from "./trip-route-panel";

let locale = "en";
const grants = new Set<string>();
vi.mock("@/lib/config", () => ({ apiBaseUrl: "https://gateway.example/api/v1" }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({
  hasPermission: (permission: string) => grants.has(permission),
}) }));
vi.mock("@/lib/i18n", async (original) => {
  const actual = await original<typeof import("@/lib/i18n")>();
  return { ...actual, useTranslation: () => ({
    locale, t: (key: string, params?: Record<string, string | number>) => actual.resolveLocaleMessage(locale, key, params),
  }) };
});
const id = "00000000-0000-4000-8000-000000000001";
const trip = tripDetailSchema.parse({
  id, tripNumber: "TRIP-1", warehouseId: id, status: "DRAFT", plannedStartAt: "2026-10-25T00:00:00.000Z",
  vehicleId: null, driverId: null, totalWeight: "0", totalVolume: "0", version: 1,
  depotSnapshot: { id, code: "WH", name: "Depot", addressLine: "Address", ward: null, district: null,
    province: "Province", postalCode: null, latitude: null, longitude: null, status: "ACTIVE",
    createdAt: "2026-10-25T00:00:00.000Z", updatedAt: "2026-10-25T00:00:00.000Z", version: 1 },
  shipments: [], stops: [],
});
const render = () => renderToStaticMarkup(<TripRoutePanel
  trip={trip} scope={{ tenantId: id, userId: id }} disabled={false}
  onReload={vi.fn()} onLockedChange={vi.fn()}/> );
describe("Route workspace authorization presentation", () => {
  it("does not fetch or render route history without route read permission", () => {
    grants.clear();
    expect(render()).toBe("");
  });
  it.each(["vi", "en"])("renders localized read-only route workspace in %s", (language) => {
    locale = language;
    grants.clear();
    grants.add("transport:route:read");
    const html = render();
    expect(html).toContain(resolveLocaleMessage(locale, "transport.route.title"));
    expect(html).not.toContain("transport.route.");
    expect(html).not.toContain(resolveLocaleMessage(locale, "transport.route.manual"));
    expect(html).not.toContain(resolveLocaleMessage(locale, "transport.route.optimize"));
  });
  it("keeps optimize and approve permissions independent", () => {
    locale = "en";
    grants.clear();
    grants.add("transport:route:read");
    grants.add("transport:route:optimize");
    const html = render();
    expect(html).toContain(resolveLocaleMessage(locale, "transport.route.optimize"));
    expect(html).not.toContain(resolveLocaleMessage(locale, "transport.route.manual"));
  });
});
