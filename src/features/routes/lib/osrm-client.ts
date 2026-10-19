/**
 * OSRM Road Network Client
 * Fetches real driving routes with full street geometry from OSRM.
 */

export interface OsrmRouteResult {
  polyline: [number, number][]; // [lat, lng] format for Leaflet
  distanceKm: number;
  durationMinutes: number;
}

/**
 * Fetch detailed street geometry following real roads.
 * @param coordinates Array of { lat, lng } stops in visit order (including depot start & end)
 */
export async function fetchOsrmDrivingRoute(
  coordinates: { lat: number; lng: number }[]
): Promise<OsrmRouteResult | null> {
  if (coordinates.length < 2) return null;

  try {
    // OSRM requires format: {lng},{lat};{lng},{lat}
    const coordString = coordinates.map((c) => `${c.lng},${c.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const geojsonCoords = route.geometry.coordinates as [number, number][];

    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
    const leafletCoords: [number, number][] = geojsonCoords.map(([lng, lat]) => [lat, lng]);

    return {
      polyline: leafletCoords,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.round(route.duration / 60),
    };
  } catch (error) {
    console.warn("Could not fetch live OSRM street route:", error);
    return null;
  }
}
