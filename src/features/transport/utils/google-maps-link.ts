export interface GoogleMapsStopLocation {
  sequence?: number;
  label?: string | null;
  addressLine?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}

export interface GoogleMapsRouteLeg {
  index: number;
  startSequence: number;
  endSequence: number;
  stopCount: number;
  url: string;
}

const GOOGLE_MAPS_DIR_BASE = "https://www.google.com/maps/dir/?api=1";
// Google Maps URLs reliably support up to 9 waypoints + 1 destination = 10 stops per link.
export const MAX_GOOGLE_MAPS_STOPS_PER_LEG = 10;

export function formatStopAddressForMaps(stop: GoogleMapsStopLocation): string {
  return [stop.addressLine, stop.ward, stop.district, stop.province]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

/**
 * Resolve a stop to a Google Maps query string:
 * Priority 1: Full formatted street address (most accurate in Vietnam / Google Maps geocoder).
 * Priority 2: Coordinates ("lat,lng") fallback only when address text is empty.
 */
export function resolveGoogleMapsQuery(stop: GoogleMapsStopLocation): string | null {
  const formattedAddress = formatStopAddressForMaps(stop);
  if (formattedAddress.length > 0) {
    return formattedAddress;
  }
  const lat = stop.latitude?.trim();
  const lng = stop.longitude?.trim();
  if (lat && lng) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (
      Number.isFinite(latNum) &&
      Number.isFinite(lngNum) &&
      Math.abs(latNum) <= 90 &&
      Math.abs(lngNum) <= 180
    ) {
      return `${lat},${lng}`;
    }
  }
  return null;
}

export function buildSingleStopGoogleMapsUrl(
  stop: GoogleMapsStopLocation,
): string | null {
  const destination = resolveGoogleMapsQuery(stop);
  if (!destination) return null;
  const params = new URLSearchParams({
    destination,
    travelmode: "driving",
  });
  return `${GOOGLE_MAPS_DIR_BASE}&${params.toString()}`;
}

export function buildMultiStopGoogleMapsLegs(
  stops: GoogleMapsStopLocation[],
  options?: { origin?: GoogleMapsStopLocation | null },
): GoogleMapsRouteLeg[] {
  const resolved = stops
    .map((stop, idx) => ({
      sequence: stop.sequence ?? idx + 1,
      query: resolveGoogleMapsQuery(stop),
    }))
    .filter((item): item is { sequence: number; query: string } => item.query !== null);

  if (resolved.length === 0) return [];

  const legs: GoogleMapsRouteLeg[] = [];
  const originQuery = options?.origin ? resolveGoogleMapsQuery(options.origin) : null;

  for (let start = 0; start < resolved.length; start += MAX_GOOGLE_MAPS_STOPS_PER_LEG) {
    const chunk = resolved.slice(start, start + MAX_GOOGLE_MAPS_STOPS_PER_LEG);
    const destination = chunk[chunk.length - 1]!.query;
    const waypoints = chunk.slice(0, -1).map((item) => item.query);

    const params = new URLSearchParams();
    if (start === 0 && originQuery) {
      params.set("origin", originQuery);
    } else if (start > 0) {
      const previousStop = resolved[start - 1];
      if (previousStop) {
        params.set("origin", previousStop.query);
      }
    }
    params.set("destination", destination);
    if (waypoints.length > 0) {
      params.set("waypoints", waypoints.join("|"));
    }
    params.set("travelmode", "driving");

    legs.push({
      index: legs.length + 1,
      startSequence: chunk[0]!.sequence,
      endSequence: chunk[chunk.length - 1]!.sequence,
      stopCount: chunk.length,
      url: `${GOOGLE_MAPS_DIR_BASE}&${params.toString()}`,
    });
  }

  return legs;
}
