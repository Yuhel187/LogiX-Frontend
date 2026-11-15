export function moveRouteStop(
  stopIds: readonly string[],
  index: number,
  direction: -1 | 1
): string[] {
  const target = index + direction;
  const current = stopIds[index];
  const next = stopIds[target];
  if (current === undefined || next === undefined) {
    throw new RangeError("Stop position is outside the route.");
  }
  const result = [...stopIds];
  result[index] = next;
  result[target] = current;
  return result;
}

export function routeCoordinate(
  latitude: string | null,
  longitude: string | null
): [number, number] | null {
  if (latitude === null || longitude === null) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

const VIETNAM_QL1A_WAYPOINTS_SOUTH_TO_NORTH: readonly [number, number][] = [
  [10.9574, 106.8427], // Bien Hoa / Dong Nai (QL1A)
  [10.9289, 108.1021], // Phan Thiet, Binh Thuan
  [11.5643, 108.9886], // Phan Rang, Ninh Thuan
  [12.2388, 109.1967], // Nha Trang, Khanh Hoa
  [13.0955, 109.3209], // Tuy Hoa, Phu Yen
  [13.782, 109.2197],  // Quy Nhon, Binh Dinh
  [15.1205, 108.7923], // Quang Ngai
  [15.5736, 108.474],  // Tam Ky, Quang Nam
  [16.0544, 108.2022], // Da Nang
  [16.4637, 107.5909], // Hue
  [16.8163, 107.1003], // Dong Ha, Quang Tri
  [17.4689, 106.6223], // Dong Hoi, Quang Binh
  [18.3428, 105.9057], // Ha Tinh
  [18.6796, 105.6813], // Vinh, Nghe An
  [19.8067, 105.7852], // Thanh Hoa
  [20.2506, 105.9745], // Ninh Binh
];

export function minVietnamLongitude(lat: number): number {
  if (lat < 8.0 || lat > 23.5) return 180.0;
  if (lat < 10.6) return 103.8;
  if (lat < 11.5) return 105.85;
  if (lat < 12.5) return 107.15;
  if (lat < 14.8) return 107.35;
  if (lat < 16.2) return 107.2;
  if (lat < 17.0) return 106.55;
  if (lat < 18.0) return 105.7;
  if (lat < 19.2) return 104.7;
  if (lat < 20.5) return 104.5;
  return 102.14;
}

export function isPointInVietnamCorridor(lat: number, lng: number): boolean {
  if (lat < 8.15 || lat > 23.45) return false;
  if (lng > 109.6) return false;
  return lng >= minVietnamLongitude(lat);
}

export function needsVietnamCoastalCorridor(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): boolean {
  if (
    !isPointInVietnamCorridor(lat1, lng1) ||
    !isPointInVietnamCorridor(lat2, lng2)
  ) {
    return false;
  }
  const latDiff = Math.abs(lat2 - lat1);
  if (latDiff >= 1.8) return true;

  const steps = 16;
  for (let idx = 1; idx < steps; idx += 1) {
    const ratio = idx / steps;
    const sampleLat = lat1 + (lat2 - lat1) * ratio;
    const sampleLng = lng1 + (lng2 - lng1) * ratio;
    if (!isPointInVietnamCorridor(sampleLat, sampleLng)) {
      return true;
    }
  }
  return false;
}

export function buildVietnamCorridorWaypoints(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): [number, number][] {
  if (!needsVietnamCoastalCorridor(lat1, lng1, lat2, lng2)) {
    return [
      [lat1, lng1],
      [lat2, lng2],
    ];
  }
  const lowLat = Math.min(lat1, lat2) + 0.25;
  const highLat = Math.max(lat1, lat2) - 0.25;
  const intermediate = VIETNAM_QL1A_WAYPOINTS_SOUTH_TO_NORTH.filter(
    ([wpLat]) => wpLat >= lowLat && wpLat <= highLat
  );
  const ordered = lat1 <= lat2 ? intermediate : [...intermediate].reverse();
  return [[lat1, lng1], ...ordered, [lat2, lng2]];
}

export function buildVietnamDomesticPath(
  points: readonly [number, number][]
): [number, number][] {
  if (points.length <= 1) return [...points];
  const expanded: [number, number][] = [points[0]!];
  for (let idx = 1; idx < points.length; idx += 1) {
    const [prevLat, prevLng] = points[idx - 1]!;
    const [currLat, currLng] = points[idx]!;
    const segment = buildVietnamCorridorWaypoints(
      prevLat,
      prevLng,
      currLat,
      currLng
    );
    expanded.push(...segment.slice(1));
  }
  return expanded;
}

export function isLeafletPolylineInVietnam(
  polyline: readonly [number, number][]
): boolean {
  if (polyline.length === 0) return false;
  return polyline.every(([lat, lng]) => isPointInVietnamCorridor(lat, lng));
}

export function resolveVietnamDomesticPolyline(
  geometry: readonly [number, number][] | null,
  stopPoints: readonly [number, number][]
): { path: [number, number][]; isRoadGeometry: boolean } {
  if (geometry && geometry.length >= 2 && isLeafletPolylineInVietnam(geometry)) {
    return { path: [...geometry], isRoadGeometry: true };
  }
  return {
    path: buildVietnamDomesticPath(stopPoints),
    isRoadGeometry: false,
  };
}

export function leafletGeometry(
  geoJsonCoordinates: [number, number][] | null
): [number, number][] | null {
  if (geoJsonCoordinates === null) return null;
  return geoJsonCoordinates.map(([longitude, latitude]) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new RangeError("Invalid GeoJSON longitude/latitude pair.");
    }
    return [latitude, longitude];
  });
}

export function routePreviewUsable(
  preview: { expectedVersion: number; expiresAt: string } | null,
  tripVersion: number,
  now: number
): boolean {
  return preview !== null &&
    preview.expectedVersion === tripVersion &&
    Date.parse(preview.expiresAt) > now;
}
