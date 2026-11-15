import { describe, expect, it } from "vitest";
import {
  buildVietnamDomesticPath,
  isLeafletPolylineInVietnam,
  leafletGeometry,
  moveRouteStop,
  resolveVietnamDomesticPolyline,
  routeCoordinate,
  routePreviewUsable,
} from "./route-draft";

describe("Trip route presentation", () => {
  it("reorders without dropping, duplicating or mutating stops", () => {
    const stops = ["first", "second", "third"];
    expect(moveRouteStop(stops, 2, -1)).toEqual(["first", "third", "second"]);
    expect(stops).toEqual(["first", "second", "third"]);
    expect(() => moveRouteStop(stops, 0, -1)).toThrow(RangeError);
    expect(() => moveRouteStop(stops, 4, -1)).toThrow(RangeError);
  });

  it("converts GeoJSON longitude/latitude explicitly, never by magnitude", () => {
    expect(leafletGeometry([[20, 50], [-120, -30]])).toEqual([[50, 20], [-30, -120]]);
    expect(leafletGeometry(null)).toBeNull();
    expect(() => leafletGeometry([[20, 91]])).toThrow();
  });

  it("does not fabricate map coordinates for incomplete snapshots", () => {
    expect(routeCoordinate("10.2", "106.4")).toEqual([10.2, 106.4]);
    expect(routeCoordinate(null, "106")).toBeNull();
    expect(routeCoordinate("91", "106")).toBeNull();
    expect(routeCoordinate("NaN", "106")).toBeNull();
  });

  it("requires a current version and an unexpired preview at the exact expiry boundary", () => {
    const expiresAt = "2026-10-25T12:00:00.000Z";
    const preview = { expectedVersion: 4, expiresAt };
    const expiry = Date.parse(expiresAt);
    expect(routePreviewUsable(preview, 4, expiry - 1)).toBe(true);
    expect(routePreviewUsable(preview, 4, expiry)).toBe(false);
    expect(routePreviewUsable(preview, 5, expiry - 1)).toBe(false);
    expect(routePreviewUsable({ ...preview, expiresAt: "invalid" }, 4, expiry)).toBe(false);
    expect(routePreviewUsable(null, 4, expiry)).toBe(false);
  });

  it("expands cross-regional Vietnam paths along the domestic QL1A corridor instead of crossing Cambodia/Laos", () => {
    const hcmc: [number, number] = [10.814421, 106.623118];
    const daNang: [number, number] = [16.073429, 108.14989];
    const haNoi: [number, number] = [21.036237, 105.908456];

    const domesticPath = buildVietnamDomesticPath([hcmc, daNang, haNoi, hcmc]);
    expect(domesticPath.length).toBeGreaterThan(20);
    expect(isLeafletPolylineInVietnam(domesticPath)).toBe(true);

    // A cross-border polyline through Kratie (Cambodia) and Pakse (Laos) is rejected and replaced
    const crossBorderPolyline: [number, number][] = [
      hcmc,
      [12.488, 106.018], // Kratie, Cambodia
      [15.12, 105.798],  // Pakse, Laos
      haNoi,
    ];
    const resolved = resolveVietnamDomesticPolyline(crossBorderPolyline, [
      hcmc,
      daNang,
      haNoi,
      hcmc,
    ]);
    expect(resolved.isRoadGeometry).toBe(false);
    expect(isLeafletPolylineInVietnam(resolved.path)).toBe(true);
  });
});
