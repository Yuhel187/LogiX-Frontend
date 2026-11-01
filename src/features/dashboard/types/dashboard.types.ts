export type DashboardPeriod = "today" | "7d" | "30d";

export interface DashboardScope {
  warehouseId: string | "all";
  period: DashboardPeriod;
}

export interface TriageMetrics {
  pendingStockCount: number;
  deliveryFailedCount: number;
  outOfStockSkuCount: number;
  delayedTripsCount: number;
  pendingAgentActionsCount: number;
}

export interface KpiMetrics {
  ordersToday: {
    total: number;
    confirmed: number;
    processing: number;
    completed: number;
    percentChangeVsYesterday: number;
  };
  shipmentPool: {
    readyToShipCount: number;
  };
  transport: {
    activeTripsCount: number;
    deliverySuccessRate: number; // percentage (0 - 100)
    totalStops: number;
    completedStops: number;
  };
  inventory: {
    lowStockSkuCount: number;
    outOfStockSkuCount: number;
  };
}

export interface OrderFlowPoint {
  date: string;
  label: string;
  created: number;
  completed: number;
  cancelled: number;
}

export interface ForecastPoint {
  ds: string;
  label: string;
  actual: number | null;
  forecast: number | null;
  lowerBound: number | null;
  upperBound: number | null;
}

export interface SkuForecastData {
  skuCode: string;
  productName: string;
  unit: string;
  status: "ACTIVE" | "TRAINING" | "INSUFFICIENT_DATA";
  points: ForecastPoint[];
}

export interface ActiveTripItem {
  id: string;
  tripCode: string;
  driverName: string;
  vehiclePlate: string;
  completedStops: number;
  totalStops: number;
  status: "DISPATCHED" | "IN_TRANSIT" | "COMPLETED";
}

export interface LowStockItem {
  productId: string;
  skuCode: string;
  productName: string;
  warehouseName: string;
  availableQuantity: number;
  safetyStock: number;
  unit: string;
}

export interface DashboardSummary {
  scope: DashboardScope;
  updatedAt: string;
  triage: TriageMetrics;
  kpis: KpiMetrics;
  orderThroughput: OrderFlowPoint[];
  forecast: SkuForecastData;
  activeTrips: ActiveTripItem[];
  lowStockItems: LowStockItem[];
}
