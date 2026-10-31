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
