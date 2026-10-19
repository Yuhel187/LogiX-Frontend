export interface TripStop {
  id: string;
  sequence: number;
  stopName: string;
  customerName: string;
  address: string;
  lat: number;
  lng: number;
  demandWeightKg: number;
  demandVolumeM3: number;
  estimatedArrivalMinutes: number;
  distanceFromPrevKm: number;
  status: "PENDING" | "DELIVERED" | "FAILED";
}

export interface RoutePlan {
  id: string;
  tripId: string;
  tripCode: string;
  vehiclePlate: string;
  vehicleCapacityKg: number;
  driverName: string;
  depot: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  totalDistanceKm: number;
  totalDurationMinutes: number;
  baselineDistanceKm: number;
  baselineNearestNeighborKm: number;
  distanceSavedKm: number;
  savingsPercent: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  feasibilityStatus: "FEASIBLE" | "INFEASIBLE";
  status: "PROPOSED" | "APPROVED" | "REJECTED" | "DISPATCHED";
  solverMethod: string;
  distanceProvider: string;
  stops: TripStop[];
  osrmPolyline: [number, number][];
  baselinePolyline: [number, number][];
}
