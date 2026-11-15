import { describe, expect, it, vi } from "vitest";
import { isPointInVietnamCorridor } from "@/features/transport/utils/route-draft";
import {
  lookupVietnamFallbackCoordinates,
  normalizeVietnameseText,
  resolveVietnamAddressCoordinates,
} from "./vietnam-geocoder";

describe("Vietnam address geocoder", () => {
  it("normalizes Vietnamese diacritics and punctuation cleanly", () => {
    expect(normalizeVietnameseText("Quận Liên Chiểu, TP. Đà Nẵng")).toBe(
      "quan lien chieu tp da nang"
    );
  });

  it("resolves Vietnam logistics hubs and provinces from the offline catalog", () => {
    const tanBinh = lookupVietnamFallbackCoordinates({
      addressLine: "123 Cộng Hòa",
      district: "Quận Tân Bình",
      province: "TP. Hồ Chí Minh",
    });
    expect(tanBinh).not.toBeNull();
    expect(
      isPointInVietnamCorridor(
        Number(tanBinh!.latitude),
        Number(tanBinh!.longitude)
      )
    ).toBe(true);

    const daNang = lookupVietnamFallbackCoordinates({
      addressLine: "KCN Hòa Khánh",
      district: "Liên Chiểu",
      province: "Đà Nẵng",
    });
    expect(daNang).not.toBeNull();
    expect(daNang!.latitude).toBe("16.073429");
    expect(daNang!.longitude).toBe("108.149890");
  });

  it("uses Nominatim when inside Vietnam and rejects foreign coordinates", async () => {
    const mockFetchValid = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: "10.801500",
          lon: "106.654200",
          display_name: "Tân Bình, TP.HCM, Việt Nam",
        },
      ],
    }) as unknown as typeof fetch;

    const validRes = await resolveVietnamAddressCoordinates(
      {
        addressLine: "18 Cộng Hòa",
        district: "Tân Bình",
        province: "Hồ Chí Minh",
      },
      mockFetchValid
    );
    expect(validRes?.source).toBe("nominatim");
    expect(validRes?.latitude).toBe("10.801500");

    // Foreign coordinate (Pakse, Laos) must be rejected and fall back to Vietnam catalog
    const mockFetchForeign = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: "15.120000",
          lon: "105.798000",
          display_name: "Pakse, Laos",
        },
      ],
    }) as unknown as typeof fetch;

    const fallbackRes = await resolveVietnamAddressCoordinates(
      {
        addressLine: "KCN Hòa Khánh",
        district: "Liên Chiểu",
        province: "Đà Nẵng",
      },
      mockFetchForeign
    );
    expect(fallbackRes?.source).toBe("vietnam_catalog");
    expect(
      isPointInVietnamCorridor(
        Number(fallbackRes!.latitude),
        Number(fallbackRes!.longitude)
      )
    ).toBe(true);
  });
});
