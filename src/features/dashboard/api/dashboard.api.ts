import { listOrdersApi } from "@/features/orders/api/orders.api";
import { listBalancesApi } from "@/features/inventory/api/inventory.api";
import { listShipmentsApi } from "@/features/shipments/api/shipments.api";
import { listTripsApi } from "@/features/transport/api/trips.api";
import { listWarehousesApi } from "@/features/master-data/api/warehouses.api";
import { listProductsApi } from "@/features/master-data/api/products.api";
import { authFetch } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import type {
  ActiveTripItem,
  DashboardScope,
  DashboardSummary,
  ForecastPoint,
  LowStockItem,
  OrderFlowPoint,
  SkuForecastData,
} from "../types/dashboard.types";

function getDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDayLabel(date: Date): string {
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dayName = days[date.getDay()];
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${dayName} (${d}/${m})`;
}

interface ForecastPointResponse {
  forecast_date: string;
  predicted_quantity: number;
  lower_bound: number;
  upper_bound: number;
  baseline_naive?: number;
  baseline_moving_average_7?: number;
  baseline_seasonal_naive_7?: number;
}

interface ForecastRunResponse {
  forecast_run_id?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  product_id?: string;
  sku_code?: string;
  product_name?: string;
  status?: string;
  model_name?: string;
  forecast_points?: ForecastPointResponse[];
}

async function fetchSkuForecastApi(
  warehouseId?: string,
  productId?: string,
  signal?: AbortSignal
): Promise<ForecastRunResponse | null> {
  if (!warehouseId || warehouseId === "all" || !productId) {
    return null;
  }
  try {
    const params = new URLSearchParams({
      warehouse_id: warehouseId,
      product_id: productId,
      horizon_days: "7",
    });
    const response = await authFetch(
      `${apiBaseUrl}/forecast/results?${params.toString()}`,
      {
        method: "GET",
        signal,
      }
    );
    if (!response.ok) return null;
    return (await response.json()) as ForecastRunResponse;
  } catch {
    return null;
  }
}

export async function fetchDashboardSummaryApi(
  scope: DashboardScope,
  signal?: AbortSignal
): Promise<DashboardSummary> {
  const warehouseFilter =
    scope.warehouseId === "all" ? undefined : scope.warehouseId;

  // 1. Concurrently fetch core domain resources from backend databases
  const [
    ordersResult,
    pendingStockResult,
    deliveryFailedResult,
    shipmentsResult,
    tripsResult,
    balancesResult,
    warehousesResult,
    productsResult,
  ] = await Promise.allSettled([
    listOrdersApi(
      {
        warehouseId: warehouseFilter,
        pageSize: 100,
      },
      signal
    ),
    listOrdersApi(
      {
        warehouseId: warehouseFilter,
        statuses: ["PENDING_STOCK"],
        pageSize: 1,
      },
      signal
    ),
    listOrdersApi(
      {
        warehouseId: warehouseFilter,
        statuses: ["DELIVERY_FAILED"],
        pageSize: 1,
      },
      signal
    ),
    listShipmentsApi(
      {
        statuses: ["READY_TO_SHIP"],
        pageSize: 100,
      },
      signal
    ),
    listTripsApi(
      {
        page: 1,
        pageSize: 50,
      },
      signal
    ),
    listBalancesApi({
      warehouseId: warehouseFilter,
      lowStockOnly: true,
      pageSize: 50,
    }),
    listWarehousesApi({ pageSize: 50 }),
    listProductsApi({ pageSize: 50 }),
  ]);

  const orders = ordersResult.status === "fulfilled" ? ordersResult.value.items : [];
  const shipments = shipmentsResult.status === "fulfilled" ? shipmentsResult.value.items : [];
  const trips = tripsResult.status === "fulfilled" ? tripsResult.value.items : [];
  const balances = balancesResult.status === "fulfilled" ? balancesResult.value.items : [];
  const warehouses = warehousesResult.status === "fulfilled" ? warehousesResult.value.items : [];
  const products = productsResult.status === "fulfilled" ? productsResult.value.items : [];

  const productMap = new Map(products.map((p) => [p.id, p]));
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

  // 2. Real Triage Metrics
  const pendingStockCount =
    pendingStockResult.status === "fulfilled"
      ? pendingStockResult.value.total
      : orders.filter((o) => o.status === "PENDING_STOCK").length;

  const deliveryFailedCount =
    deliveryFailedResult.status === "fulfilled"
      ? deliveryFailedResult.value.total
      : orders.filter((o) => o.status === "DELIVERY_FAILED").length;

  const outOfStockSkuCount = balances.filter(
    (b) => Number(b.availableQuantity) <= 0
  ).length;

  const delayedTrips = trips.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "CANCELED"
  );

  const triage = {
    pendingStockCount,
    deliveryFailedCount,
    outOfStockSkuCount,
    delayedTripsCount: delayedTrips.filter((t) => t.status === "CANCELED").length,
    pendingAgentActionsCount: 0,
  };

  // 3. Real Orders Metrics respecting scope.period vs previous equivalent period
  const today = new Date();
  const periodDays = scope.period === "30d" ? 30 : scope.period === "7d" ? 7 : 1;
  const currentDateKeys = new Set<string>();
  const prevDateKeys = new Set<string>();
  for (let i = 0; i < periodDays; i++) {
    const curr = new Date(today);
    curr.setDate(curr.getDate() - i);
    currentDateKeys.add(getDayKey(curr));

    const prev = new Date(today);
    prev.setDate(prev.getDate() - (periodDays + i));
    prevDateKeys.add(getDayKey(prev));
  }

  const ordersInPeriod = orders.filter((o) =>
    currentDateKeys.has(o.createdAt.slice(0, 10))
  );
  const ordersPrevPeriod = orders.filter((o) =>
    prevDateKeys.has(o.createdAt.slice(0, 10))
  );

  const confirmedToday = ordersInPeriod.filter((o) => o.status === "CONFIRMED").length;
  const processingToday = ordersInPeriod.filter(
    (o) => o.status === "PICKING" || o.status === "READY_TO_SHIP"
  ).length;
  const completedToday = ordersInPeriod.filter((o) => o.status === "COMPLETED").length;

  let percentChangeVsYesterday = 0;
  if (ordersPrevPeriod.length > 0) {
    percentChangeVsYesterday =
      Math.round(((ordersInPeriod.length - ordersPrevPeriod.length) / ordersPrevPeriod.length) * 1000) / 10;
  } else if (ordersInPeriod.length > 0) {
    percentChangeVsYesterday = 100;
  }

  // 4. Shipment Pool
  const readyToShipCount = shipments.length;

  // 5. Real Transport Metrics with Driver/Vehicle Snapshots & Exact Stops
  const activeTripsList = trips.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "APPROVED"
  );
  const completedTrips = trips.filter((t) => t.status === "COMPLETED");
  const canceledTrips = trips.filter((t) => t.status === "CANCELED");
  const finishedTripsCount = completedTrips.length + canceledTrips.length;
  const deliverySuccessRate =
    finishedTripsCount > 0
      ? Math.round((completedTrips.length / finishedTripsCount) * 1000) / 10
      : 100;

  const activeTripItems: ActiveTripItem[] = activeTripsList.slice(0, 5).map((t) => {
    const driverSnap = t.driverSnapshot as { displayName?: string; code?: string } | null;
    const vehicleSnap = t.vehicleSnapshot as { licensePlate?: string; code?: string } | null;
    const tripTotalStops = (t as { totalStops?: number }).totalStops ?? 0;
    const tripCompletedStops = (t as { completedStops?: number }).completedStops ?? 0;

    return {
      id: t.id,
      tripCode: t.tripNumber,
      driverName: driverSnap?.displayName || (t.driverId ? "Tài xế đã gán" : "Chưa gán tài xế"),
      vehiclePlate: vehicleSnap?.licensePlate || (t.vehicleId ? "Xe đã gán" : "Chờ xếp xe"),
      totalStops: tripTotalStops,
      completedStops: tripCompletedStops,
      status: t.status === "IN_PROGRESS" ? "IN_TRANSIT" : "DISPATCHED",
    };
  });

  const totalStopsOverall = activeTripItems.reduce((acc, t) => acc + t.totalStops, 0);
  const completedStopsOverall = activeTripItems.reduce((acc, t) => acc + t.completedStops, 0);

  // 6. Real Inventory Metrics
  const lowStockSkuCount = balances.length;

  const lowStockItems: LowStockItem[] = balances.slice(0, 5).map((b) => {
    const prod = productMap.get(b.productId);
    const wh = warehouseMap.get(b.warehouseId);
    return {
      productId: b.productId,
      skuCode: prod?.sku ?? b.productId.slice(0, 8),
      productName: prod?.name ?? "Sản phẩm kho",
      warehouseName: wh?.name ?? b.warehouseId.slice(0, 8),
      availableQuantity: Number(b.availableQuantity),
      safetyStock: Number(b.lowStockThreshold),
      unit: prod?.baseUnit ?? "đơn vị",
    };
  });

  // 7. Real Order Flow Points for selected period (7d or 30d)
  const orderThroughput: OrderFlowPoint[] = [];
  const throughputDays = scope.period === "30d" ? 30 : 7;
  for (let i = throughputDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = getDayKey(d);
    const dayOrders = orders.filter((o) => o.createdAt.startsWith(dateKey));

    orderThroughput.push({
      date: dateKey,
      label: getDayLabel(d),
      created: dayOrders.length,
      completed: dayOrders.filter((o) => o.status === "COMPLETED").length,
      cancelled: dayOrders.filter((o) => o.status === "CANCELED").length,
    });
  }

  // 8. Meta Prophet Forecast via forecast-service & Live Observations
  const topProduct = products[0];
  const targetWarehouseId = warehouseFilter ?? warehouses[0]?.id;
  const forecastRun = await fetchSkuForecastApi(
    targetWarehouseId,
    topProduct?.id,
    signal
  );

  const forecastPoints: ForecastPoint[] = [];

  // Historical 7 days (D-6 to D-0) calculated from actual sales orders
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = getDayKey(d);
    const dayOrders = orders.filter((o) => o.createdAt.startsWith(dateKey));

    // Actual volume count from today/past orders
    const actualOrdersCount = dayOrders.length;
    const isToday = i === 0;

    let todayForecastVal: number | null = null;
    let todayLowerVal: number | null = null;
    let todayUpperVal: number | null = null;

    if (
      isToday &&
      forecastRun &&
      forecastRun.status !== "INSUFFICIENT_DATA" &&
      forecastRun.forecast_points?.[0]
    ) {
      const p0 = forecastRun.forecast_points[0];
      todayForecastVal = Math.round(p0.predicted_quantity * 10) / 10;
      todayLowerVal = Math.round(p0.lower_bound * 10) / 10;
      todayUpperVal = Math.round(p0.upper_bound * 10) / 10;
    }

    forecastPoints.push({
      ds: `D-${i}`,
      label: isToday ? "Hôm nay" : i === 1 ? "Hôm qua" : `${i} ngày trước`,
      actual: actualOrdersCount,
      forecast: todayForecastVal,
      lowerBound: todayLowerVal,
      upperBound: todayUpperVal,
    });
  }

  // Future 7 days (D+1 to D+7) from Meta Prophet Forecast Engine
  if (
    forecastRun &&
    forecastRun.status !== "INSUFFICIENT_DATA" &&
    forecastRun.forecast_points &&
    forecastRun.forecast_points.length > 0
  ) {
    const futurePoints = forecastRun.forecast_points.slice(1, 8);
    futurePoints.forEach((pt, idx) => {
      const step = idx + 1;
      forecastPoints.push({
        ds: `D+${step}`,
        label: step === 1 ? "Ngày mai" : `+${step} ngày`,
        actual: null,
        forecast: Math.round(pt.predicted_quantity * 10) / 10,
        lowerBound: Math.round(pt.lower_bound * 10) / 10,
        upperBound: Math.round(pt.upper_bound * 10) / 10,
      });
    });
  }

  const forecastStatus: "ACTIVE" | "TRAINING" | "INSUFFICIENT_DATA" =
    !forecastRun || forecastRun.status === "INSUFFICIENT_DATA"
      ? "INSUFFICIENT_DATA"
      : forecastRun.status === "TRAINING"
        ? "TRAINING"
        : "ACTIVE";

  const forecast: SkuForecastData = {
    skuCode: topProduct ? topProduct.sku : forecastRun?.sku_code ?? "",
    productName: topProduct ? topProduct.name : forecastRun?.product_name ?? "",
    unit: topProduct ? topProduct.baseUnit : "đơn vị",
    status: forecastStatus,
    points: forecastPoints,
  };

  return {
    scope,
    updatedAt: new Date().toISOString(),
    triage,
    kpis: {
      ordersToday: {
        total: ordersInPeriod.length,
        confirmed: confirmedToday,
        processing: processingToday,
        completed: completedToday,
        percentChangeVsYesterday,
      },
      shipmentPool: {
        readyToShipCount,
      },
      transport: {
        activeTripsCount: activeTripsList.length,
        deliverySuccessRate,
        totalStops: totalStopsOverall,
        completedStops: completedStopsOverall,
      },
      inventory: {
        lowStockSkuCount,
        outOfStockSkuCount,
      },
    },
    orderThroughput,
    forecast,
    activeTrips: activeTripItems,
    lowStockItems,
  };
}
