import { isPointInVietnamCorridor } from "@/features/transport/utils/route-draft";

export interface VietnamAddressInput {
  addressLine?: string;
  ward?: string;
  district?: string;
  province?: string;
}

export interface VietnamGeocodedCoordinate {
  latitude: string;
  longitude: string;
  displayName: string;
  source: "nominatim" | "vietnam_catalog";
}

interface VietnamCatalogEntry {
  aliases: readonly string[];
  displayName: string;
  lat: number;
  lng: number;
}

export function normalizeVietnameseText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const VIETNAM_DISTRICT_CATALOG: readonly VietnamCatalogEntry[] = [
  // TP.HCM districts & logistics hubs
  { aliases: ["tan binh", "quan tan binh"], displayName: "Quận Tân Bình, TP. Hồ Chí Minh", lat: 10.801466, lng: 106.652597 },
  { aliases: ["thu duc", "tp thu duc", "thanh pho thu duc"], displayName: "TP. Thủ Đức, TP. Hồ Chí Minh", lat: 10.849409, lng: 106.753706 },
  { aliases: ["quan 1", "district 1", "ben nghe", "ben thanh"], displayName: "Quận 1, TP. Hồ Chí Minh", lat: 10.775659, lng: 106.700424 },
  { aliases: ["quan 7", "district 7", "tan phong", "phu my hung"], displayName: "Quận 7, TP. Hồ Chí Minh", lat: 10.734034, lng: 106.721579 },
  { aliases: ["quan 12", "district 12"], displayName: "Quận 12, TP. Hồ Chí Minh", lat: 10.867153, lng: 106.641332 },
  { aliases: ["binh tan", "quan binh tan"], displayName: "Quận Bình Tân, TP. Hồ Chí Minh", lat: 10.765258, lng: 106.603853 },
  { aliases: ["binh thanh", "quan binh thanh"], displayName: "Quận Bình Thạnh, TP. Hồ Chí Minh", lat: 10.810583, lng: 106.709142 },
  { aliases: ["cu chi", "huyen cu chi"], displayName: "Huyện Củ Chi, TP. Hồ Chí Minh", lat: 11.006668, lng: 106.513199 },
  { aliases: ["binh chanh", "huyen binh chanh"], displayName: "Huyện Bình Chánh, TP. Hồ Chí Minh", lat: 10.687392, lng: 106.593856 },
  // Binh Duong & Dong Nai industrial parks
  { aliases: ["thuan an", "vsip 1", "vsip i"], displayName: "TP. Thuận An, Bình Dương", lat: 10.932456, lng: 106.698712 },
  { aliases: ["di an", "song than"], displayName: "TP. Dĩ An, Bình Dương", lat: 10.906825, lng: 106.769409 },
  { aliases: ["thu dau mot"], displayName: "TP. Thủ Dầu Một, Bình Dương", lat: 10.980461, lng: 106.651901 },
  { aliases: ["ben cat", "my phuoc"], displayName: "TP. Bến Cát, Bình Dương", lat: 11.148952, lng: 106.594482 },
  { aliases: ["tan uyen", "vsip 2", "vsip ii"], displayName: "TP. Tân Uyên, Bình Dương", lat: 11.071546, lng: 106.799141 },
  { aliases: ["bien hoa", "amata"], displayName: "TP. Biên Hòa, Đồng Nai", lat: 10.957412, lng: 106.842682 },
  { aliases: ["long thanh"], displayName: "Huyện Long Thành, Đồng Nai", lat: 10.790562, lng: 106.953583 },
  { aliases: ["nhon trach"], displayName: "Huyện Nhơn Trạch, Đồng Nai", lat: 10.730118, lng: 106.87941 },
  // Da Nang districts
  { aliases: ["lien chieu", "hoa khanh"], displayName: "Quận Liên Chiểu, Đà Nẵng", lat: 16.073429, lng: 108.14989 },
  { aliases: ["hai chau"], displayName: "Quận Hải Châu, Đà Nẵng", lat: 16.054407, lng: 108.220665 },
  { aliases: ["son tra"], displayName: "Quận Sơn Trà, Đà Nẵng", lat: 16.086145, lng: 108.239842 },
  { aliases: ["cam le"], displayName: "Quận Cẩm Lệ, Đà Nẵng", lat: 16.019724, lng: 108.202866 },
  // Ha Noi districts
  { aliases: ["long bien", "sai dong"], displayName: "Quận Long Biên, Hà Nội", lat: 21.036237, lng: 105.908456 },
  { aliases: ["cau giay"], displayName: "Quận Cầu Giấy, Hà Nội", lat: 21.036245, lng: 105.790583 },
  { aliases: ["ha dong"], displayName: "Quận Hà Đông, Hà Nội", lat: 20.971359, lng: 105.778793 },
  { aliases: ["hoan kiem"], displayName: "Quận Hoàn Kiếm, Hà Nội", lat: 21.028511, lng: 105.854444 },
  { aliases: ["nam tu liem", "my dinh"], displayName: "Quận Nam Từ Liêm, Hà Nội", lat: 21.013892, lng: 105.765244 },
  { aliases: ["dong anh", "bac thang long"], displayName: "Huyện Đông Anh, Hà Nội", lat: 21.13942, lng: 105.846542 },
  { aliases: ["gia lam"], displayName: "Huyện Gia Lâm, Hà Nội", lat: 21.019091, lng: 105.938049 },
];

const VIETNAM_PROVINCE_CATALOG: readonly VietnamCatalogEntry[] = [
  { aliases: ["ho chi minh", "tp hcm", "tphcm", "hcm", "sai gon", "saigon"], displayName: "TP. Hồ Chí Minh", lat: 10.801466, lng: 106.652597 },
  { aliases: ["ha noi", "hanoi", "tp ha noi"], displayName: "Hà Nội", lat: 21.028511, lng: 105.854444 },
  { aliases: ["da nang", "danang", "tp da nang"], displayName: "Đà Nẵng", lat: 16.054407, lng: 108.202167 },
  { aliases: ["hai phong", "haiphong"], displayName: "Hải Phòng", lat: 20.844912, lng: 106.688084 },
  { aliases: ["can tho", "cantho"], displayName: "Cần Thơ", lat: 10.045162, lng: 105.746854 },
  { aliases: ["binh duong"], displayName: "Bình Dương", lat: 10.980461, lng: 106.651901 },
  { aliases: ["dong nai"], displayName: "Đồng Nai", lat: 10.957412, lng: 106.842682 },
  { aliases: ["ba ria vung tau", "vung tau", "ba ria", "phu my"], displayName: "Bà Rịa - Vũng Tàu", lat: 10.54174, lng: 107.242998 },
  { aliases: ["long an", "tan an", "ben luc", "duc hoa"], displayName: "Long An", lat: 10.535888, lng: 106.405254 },
  { aliases: ["tay ninh"], displayName: "Tây Ninh", lat: 11.335155, lng: 106.109885 },
  { aliases: ["binh phuoc", "dong xoai"], displayName: "Bình Phước", lat: 11.535439, lng: 106.88324 },
  { aliases: ["binh thuan", "phan thiet"], displayName: "Bình Thuận", lat: 10.92889, lng: 108.10208 },
  { aliases: ["ninh thuan", "phan rang"], displayName: "Ninh Thuận", lat: 11.56432, lng: 108.98858 },
  { aliases: ["khanh hoa", "nha trang", "cam ranh"], displayName: "Khánh Hòa", lat: 12.238791, lng: 109.196749 },
  { aliases: ["phu yen", "tuy hoa"], displayName: "Phú Yên", lat: 13.09546, lng: 109.32094 },
  { aliases: ["binh dinh", "quy nhon"], displayName: "Bình Định", lat: 13.782, lng: 109.21966 },
  { aliases: ["quang ngai", "dung quat"], displayName: "Quảng Ngãi", lat: 15.12047, lng: 108.79232 },
  { aliases: ["quang nam", "tam ky", "hoi an", "chu lai"], displayName: "Quảng Nam", lat: 15.57364, lng: 108.47403 },
  { aliases: ["thua thien hue", "hue", "tp hue"], displayName: "Thừa Thiên Huế", lat: 16.463713, lng: 107.590866 },
  { aliases: ["quang tri", "dong ha"], displayName: "Quảng Trị", lat: 16.81625, lng: 107.10031 },
  { aliases: ["quang binh", "dong hoi"], displayName: "Quảng Bình", lat: 17.46885, lng: 106.62226 },
  { aliases: ["ha tinh", "vung ang"], displayName: "Hà Tĩnh", lat: 18.34282, lng: 105.90569 },
  { aliases: ["nghe an", "vinh", "tp vinh"], displayName: "Nghệ An", lat: 18.679585, lng: 105.681335 },
  { aliases: ["thanh hoa", "nghi son"], displayName: "Thanh Hóa", lat: 19.806692, lng: 105.785182 },
  { aliases: ["ninh binh"], displayName: "Ninh Bình", lat: 20.250615, lng: 105.974454 },
  { aliases: ["nam dinh"], displayName: "Nam Định", lat: 20.438822, lng: 106.162105 },
  { aliases: ["thai binh"], displayName: "Thái Bình", lat: 20.446347, lng: 106.336583 },
  { aliases: ["ha nam", "phu ly"], displayName: "Hà Nam", lat: 20.54111, lng: 105.91389 },
  { aliases: ["hung yen"], displayName: "Hưng Yên", lat: 20.64637, lng: 106.05112 },
  { aliases: ["hai duong"], displayName: "Hải Dương", lat: 20.937341, lng: 106.314554 },
  { aliases: ["bac ninh", "que vo", "yen phong", "tu son"], displayName: "Bắc Ninh", lat: 21.186084, lng: 106.076314 },
  { aliases: ["bac giang"], displayName: "Bắc Giang", lat: 21.27307, lng: 106.1946 },
  { aliases: ["vinh phuc", "vinh yen", "binh xuyen"], displayName: "Vĩnh Phúc", lat: 21.30891, lng: 105.60489 },
  { aliases: ["phu tho", "viet tri"], displayName: "Phú Thọ", lat: 21.32274, lng: 105.40198 },
  { aliases: ["thai nguyen", "song cong", "pho yen"], displayName: "Thái Nguyên", lat: 21.59422, lng: 105.84817 },
  { aliases: ["quang ninh", "ha long", "cam pha", "mong cai"], displayName: "Quảng Ninh", lat: 20.9599, lng: 107.04254 },
  { aliases: ["lang son"], displayName: "Lạng Sơn", lat: 21.85371, lng: 106.76152 },
  { aliases: ["lao cai"], displayName: "Lào Cai", lat: 22.48556, lng: 103.97066 },
  { aliases: ["yen bai"], displayName: "Yên Bái", lat: 21.70508, lng: 104.8753 },
  { aliases: ["tuyen quang"], displayName: "Tuyên Quang", lat: 21.82356, lng: 105.21424 },
  { aliases: ["hoa binh"], displayName: "Hòa Bình", lat: 20.81717, lng: 105.33759 },
  { aliases: ["son la"], displayName: "Sơn La", lat: 21.3256, lng: 103.91882 },
  { aliases: ["lam dong", "da lat", "bao loc"], displayName: "Lâm Đồng", lat: 11.940419, lng: 108.458313 },
  { aliases: ["dak lak", "buon ma thuot"], displayName: "Đắk Lắk", lat: 12.66667, lng: 108.05 },
  { aliases: ["dak nong", "gia nghia"], displayName: "Đắk Nông", lat: 12.0042, lng: 107.6907 },
  { aliases: ["gia lai", "pleiku"], displayName: "Gia Lai", lat: 13.98333, lng: 108.0 },
  { aliases: ["kon tum"], displayName: "Kon Tum", lat: 14.3545, lng: 108.0076 },
  { aliases: ["tien giang", "my tho"], displayName: "Tiền Giang", lat: 10.36004, lng: 106.35995 },
  { aliases: ["ben tre"], displayName: "Bến Tre", lat: 10.24147, lng: 106.37585 },
  { aliases: ["vinh long"], displayName: "Vĩnh Long", lat: 10.25369, lng: 105.9722 },
  { aliases: ["tra vinh"], displayName: "Trà Vinh", lat: 9.93472, lng: 106.34528 },
  { aliases: ["dong thap", "cao lanh", "sa dec"], displayName: "Đồng Tháp", lat: 10.4602, lng: 105.6329 },
  { aliases: ["an giang", "long xuyen", "chau doc"], displayName: "An Giang", lat: 10.38639, lng: 105.43518 },
  { aliases: ["kien giang", "rach gia", "ha tien"], displayName: "Kiên Giang", lat: 10.01245, lng: 105.08091 },
  { aliases: ["hau giang", "vi thanh"], displayName: "Hậu Giang", lat: 9.7844, lng: 105.4701 },
  { aliases: ["soc trang"], displayName: "Sóc Trăng", lat: 9.60252, lng: 105.9739 },
  { aliases: ["bac lieu"], displayName: "Bạc Liêu", lat: 9.29404, lng: 105.72776 },
  { aliases: ["ca mau"], displayName: "Cà Mau", lat: 9.17682, lng: 105.15242 },
];

export function lookupVietnamFallbackCoordinates(
  input: VietnamAddressInput
): VietnamGeocodedCoordinate | null {
  const combinedDistrict = normalizeVietnameseText(
    [input.ward, input.district, input.addressLine].filter(Boolean).join(" ")
  );
  const normalizedProvince = normalizeVietnameseText(input.province ?? "");
  const combinedAll = normalizeVietnameseText(
    [input.addressLine, input.ward, input.district, input.province]
      .filter(Boolean)
      .join(" ")
  );

  if (!combinedAll) return null;

  for (const entry of VIETNAM_DISTRICT_CATALOG) {
    if (
      entry.aliases.some(
        (alias) =>
          combinedDistrict.includes(alias) || combinedAll.includes(alias)
      )
    ) {
      return {
        latitude: entry.lat.toFixed(6),
        longitude: entry.lng.toFixed(6),
        displayName: entry.displayName,
        source: "vietnam_catalog",
      };
    }
  }

  for (const entry of VIETNAM_PROVINCE_CATALOG) {
    if (
      entry.aliases.some(
        (alias) =>
          normalizedProvince.includes(alias) || combinedAll.includes(alias)
      )
    ) {
      return {
        latitude: entry.lat.toFixed(6),
        longitude: entry.lng.toFixed(6),
        displayName: entry.displayName,
        source: "vietnam_catalog",
      };
    }
  }

  return null;
}

export async function resolveVietnamAddressCoordinates(
  input: VietnamAddressInput,
  fetchImpl: typeof fetch = fetch
): Promise<VietnamGeocodedCoordinate | null> {
  const queryParts = [
    input.addressLine?.trim(),
    input.ward?.trim(),
    input.district?.trim(),
    input.province?.trim(),
    "Việt Nam",
  ].filter((part): part is string => Boolean(part && part.length > 0));

  if (queryParts.length <= 1) {
    return null;
  }

  const fallback = lookupVietnamFallbackCoordinates(input);
  const query = queryParts.join(", ");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=vn&limit=3&q=${encodeURIComponent(
      query
    )}`;
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.ok) {
      const data = (await response.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
      }>;
      if (Array.isArray(data)) {
        for (const candidate of data) {
          const lat = Number(candidate.lat);
          const lng = Number(candidate.lon);
          if (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            isPointInVietnamCorridor(lat, lng)
          ) {
            return {
              latitude: lat.toFixed(6),
              longitude: lng.toFixed(6),
              displayName: candidate.display_name ?? query,
              source: "nominatim",
            };
          }
        }
      }
    }
  } catch {
    // Fall back to deterministic Vietnam province/district catalog
  }

  return fallback;
}
