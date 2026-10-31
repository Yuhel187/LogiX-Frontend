export interface RouteSummary {
  planVersion: number;
  source: "MANUAL" | "OPTIMIZED" | "OVERRIDE";
  distanceKm: string | null;
  durationMinutes: string | null;
  approvedByLabel: string | null;
  approvedAt: string | null;
  vehicleLabel: string | null;
  driverLabel: string | null;
}
