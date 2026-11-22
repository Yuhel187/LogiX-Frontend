import { describe, expect, it } from "vitest";
import {
  buildMultiStopGoogleMapsLegs,
  buildSingleStopGoogleMapsUrl,
  MAX_GOOGLE_MAPS_STOPS_PER_LEG,
  resolveGoogleMapsQuery,
} from "./google-maps-link";

describe("google-maps-link", () => {
  it("prefers full formatted address over coordinates", () => {
    const query = resolveGoogleMapsQuery({
      addressLine: "148 Phan Xích Long",
      ward: "Phường 2",
      district: "Quận Phú Nhuận",
      province: "Hồ Chí Minh",
      latitude: "10.798000",
      longitude: "106.688000",
    });
    expect(query).toBe("148 Phan Xích Long, Phường 2, Quận Phú Nhuận, Hồ Chí Minh");
  });

  it("falls back to lat,lng only when address is empty", () => {
    const query = resolveGoogleMapsQuery({
      addressLine: "  ",
      ward: null,
      district: null,
      province: null,
      latitude: "10.798000",
      longitude: "106.688000",
    });
    expect(query).toBe("10.798000,106.688000");
  });

  it("returns null when both address and valid coordinates are missing", () => {
    expect(resolveGoogleMapsQuery({ addressLine: "", latitude: null, longitude: null })).toBeNull();
    expect(buildSingleStopGoogleMapsUrl({ addressLine: "", latitude: "999", longitude: "0" })).toBeNull();
  });

  it("builds a single-stop driving URL with UTF-8 Vietnamese encoding", () => {
    const url = buildSingleStopGoogleMapsUrl({
      addressLine: "18 Cộng Hòa",
      district: "Tân Bình",
      province: "Hồ Chí Minh",
    });
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("api")).toBe("1");
    expect(parsed.searchParams.get("destination")).toBe("18 Cộng Hòa, Tân Bình, Hồ Chí Minh");
    expect(parsed.searchParams.get("travelmode")).toBe("driving");
    expect(parsed.searchParams.has("origin")).toBe(false);
  });

  it("splits more than 10 stops into sequential legs without dropping stops", () => {
    const stops = Array.from({ length: 12 }, (_, idx) => ({
      sequence: idx + 1,
      addressLine: `${idx + 1} Đường Số 1`,
      province: "Hồ Chí Minh",
    }));

    const legs = buildMultiStopGoogleMapsLegs(stops);

    expect(MAX_GOOGLE_MAPS_STOPS_PER_LEG).toBe(10);
    expect(legs).toHaveLength(2);
    expect(legs[0]).toMatchObject({ index: 1, startSequence: 1, endSequence: 10, stopCount: 10 });
    expect(legs[1]).toMatchObject({ index: 2, startSequence: 11, endSequence: 12, stopCount: 2 });

    const leg1Url = new URL(legs[0]!.url);
    expect(leg1Url.searchParams.get("waypoints")?.split("|")).toHaveLength(9);
    expect(leg1Url.searchParams.get("destination")).toBe("10 Đường Số 1, Hồ Chí Minh");

    const leg2Url = new URL(legs[1]!.url);
    expect(leg2Url.searchParams.get("origin")).toBe("10 Đường Số 1, Hồ Chí Minh");
    expect(leg2Url.searchParams.get("waypoints")).toBe("11 Đường Số 1, Hồ Chí Minh");
    expect(leg2Url.searchParams.get("destination")).toBe("12 Đường Số 1, Hồ Chí Minh");
  });
});
