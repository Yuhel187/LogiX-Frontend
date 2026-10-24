export interface StopDetailDTO {
  trip_stop_id: string;
  sequence: number;
  stop_name: string;
  address: string;
  lat: number;
  lng: number;
  demand_weight_kg: number;
  demand_volume_m3: number;
  distance_from_prev_km: number;
  estimated_duration_minutes: number;
}

export interface ProposedRouteBackendDTO {
  trip_id: string;
  route_plan_id: string;
  depot_name: string;
  depot_address: string;
  depot_lat: number;
  depot_lng: number;
  total_distance_km: number;
  total_duration_minutes: number;
  baseline_input_order_km: number;
  baseline_nearest_neighbor_km: number;
  distance_saved_km: number;
  improvement_ratio_percent: number;
  vehicle_capacity_weight_kg: number;
  total_demand_weight_kg: number;
  vehicle_capacity_volume_m3: number;
  total_demand_volume_m3: number;
  feasibility_status: "FEASIBLE" | "INFEASIBLE";
  solver_method: string;
  distance_provider: string;
  stops: StopDetailDTO[];
  recommended_action: string;
  polyline: [number, number][]; // [lat, lng][]
  legs?: Array<{
    leg_index: number;
    from_name: string;
    to_name: string;
    distance_km: number;
    duration_minutes: number;
  }>;
}

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
  vehicleCapacityM3: number;
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
  recommendedAction?: string;
}

export function mapProposedRouteToRoutePlan(dto: ProposedRouteBackendDTO): RoutePlan {
  const stops: TripStop[] = (dto.stops || []).map((s) => ({
    id: s.trip_stop_id,
    sequence: s.sequence,
    stopName: s.stop_name,
    customerName: s.stop_name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    demandWeightKg: s.demand_weight_kg,
    demandVolumeM3: s.demand_volume_m3,
    estimatedArrivalMinutes: s.estimated_duration_minutes,
    distanceFromPrevKm: s.distance_from_prev_km,
    status: "PENDING",
  }));

  // Build baseline polyline (straight lines connecting depot -> stops -> depot in sequence)
  const baselinePolyline: [number, number][] = [
    [dto.depot_lat, dto.depot_lng],
    ...stops.map((s): [number, number] => [s.lat, s.lng]),
    [dto.depot_lat, dto.depot_lng],
  ];

  return {
    id: dto.route_plan_id,
    tripId: dto.trip_id,
    tripCode: `TRIP-${dto.trip_id.slice(0, 8).toUpperCase()}`,
    vehiclePlate: "59C-123.45 (Xe tải 1.25 Tấn)",
    vehicleCapacityKg: dto.vehicle_capacity_weight_kg || 1000.0,
    vehicleCapacityM3: dto.vehicle_capacity_volume_m3 || 8.0,
    driverName: "Nguyễn Văn Hùng (Tài xế)",
    depot: {
      name: dto.depot_name,
      address: dto.depot_address,
      lat: dto.depot_lat,
      lng: dto.depot_lng,
    },
    totalDistanceKm: dto.total_distance_km,
    totalDurationMinutes: dto.total_duration_minutes,
    baselineDistanceKm: dto.baseline_input_order_km,
    baselineNearestNeighborKm: dto.baseline_nearest_neighbor_km,
    distanceSavedKm: dto.distance_saved_km,
    savingsPercent: dto.improvement_ratio_percent,
    totalWeightKg: dto.total_demand_weight_kg,
    totalVolumeM3: dto.total_demand_volume_m3,
    feasibilityStatus: dto.feasibility_status,
    status: "PROPOSED",
    solverMethod: dto.solver_method,
    distanceProvider: dto.distance_provider,
    stops,
    osrmPolyline: dto.polyline || [],
    baselinePolyline,
    recommendedAction: dto.recommended_action,
  };
}
