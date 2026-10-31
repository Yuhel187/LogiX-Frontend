import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { resolveLocaleMessage } from "@/lib/i18n";
import type { RouteSummary } from "../types";
import { RouteSummaryPanel } from "./route-summary-panel";

let locale = "en";
vi.mock("@/lib/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useTranslation: () => ({
      locale,
      t: (key: string, params?: Record<string, string | number>) =>
        actual.resolveLocaleMessage(locale, key, params),
    }),
  };
});
const route: RouteSummary = {
  planVersion: 2,
  source: "MANUAL",
  distanceKm: null,
  durationMinutes: null,
  vehicleLabel: null,
  driverLabel: null,
  approvedByLabel: null,
  approvedAt: null,
};

describe("Saved route presentation", () => {
  it.each(["vi", "en"])("does not fabricate metrics, assignment or approval in %s", (language) => {
    locale = language;
    const html = renderToStaticMarkup(<RouteSummaryPanel route={route} selected={false} />);
    expect(html).toContain(resolveLocaleMessage(locale, "transport.route.MANUAL"));
    expect(html).toContain(resolveLocaleMessage(locale, "transport.route.unknownMetric"));
    expect(html).not.toContain("transport.route.");
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("08:00");
    expect(html).not.toContain("OR-Tools");
    expect(html).not.toContain(resolveLocaleMessage(locale, "transport.route.approvedRoute"));
  });

  it("renders stored evidence and execution selection independently", () => {
    locale = "en";
    const html = renderToStaticMarkup(<RouteSummaryPanel
      route={{ ...route,       source: "OPTIMIZED", distanceKm: "12.5", durationMinutes: "25",
        vehicleLabel: "Stored plate", driverLabel: "Stored Driver",
        approvedByLabel: "Stored Approver", approvedAt: "2026-10-25T00:00:00.000Z" }}
      selected
    />);
    expect(html).toContain("Stored plate");
    expect(html).toContain("Stored Driver");
    expect(html).toContain("Stored Approver");
    expect(html).toContain(resolveLocaleMessage(locale, "transport.route.version", { version: 2 }));
    expect(html).not.toContain("actor-1");
    expect(html).toContain(resolveLocaleMessage(locale, "transport.route.approvedRoute"));
    expect(html).not.toContain("<button");
  });
});
