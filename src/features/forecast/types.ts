export interface DailyForecastPoint {
  forecast_date: string;
  predicted_quantity: number;
  lower_bound: number;
  upper_bound: number;
  trend_component: number;
  weekly_component: number;
}

export interface MethodMetrics {
  method_name: string;
  rmse: number;
  mae: number;
  mape: number | null;
  mape_zero_policy: string;
  evaluated_days: number;
}

export interface ForecastRunResult {
  forecast_run_id: string;
  forecast_series_id: string;
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  sku_code: string;
  product_name: string;
  status: string;
  model_name: string;
  used_fallback: boolean;
  fallback_reason: string | null;
  confidence_level: number;
  observation_count: number;
  training_start_date: string;
  training_end_date: string;
  horizon_days: number;
  dataset_hash: string;
  total_predicted_7d: number;
  total_upper_bound_7d: number;
  available_stock: number;
  stockout_risk: boolean;
  shortfall_quantity: number;
  recommended_action: string;
  forecast_points: DailyForecastPoint[];
  metrics: MethodMetrics[];
}

export interface StockoutRiskItem {
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  sku_code: string;
  product_name: string;
  horizon_days: number;
  total_predicted_demand: number;
  total_upper_bound_demand: number;
  available_stock: number;
  shortfall_quantity: number;
  risk_level: "HIGH" | "MEDIUM" | "LOW" | string;
  recommended_replenishment: number;
  recommended_action: string;
}

export interface StockoutRisksResponse {
  warehouse_id: string;
  checked_sku_count: number;
  at_risk_count: number;
  items: StockoutRiskItem[];
}

export interface ForecastCatalogWarehouse {
  id: string;
  code: string;
  name: string;
}

export interface ForecastCatalogProduct {
  id: string;
  sku: string;
  name: string;
  defaultAvailableStock: number;
}

export const FORECAST_WAREHOUSES: ForecastCatalogWarehouse[] = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    code: "WH-HCM-01",
    name: "Kho Tổng Miền Nam (Tân Bình)",
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    code: "WH-BD-02",
    name: "Kho Trung Chuyển Bình Dương",
  },
];

export const FORECAST_PRODUCTS: ForecastCatalogProduct[] = [
  {
    id: "00000000-0000-0000-0000-000000000201",
    sku: "SKU-FMCG-001",
    name: "Thùng Nước Giải Khát 24 Lon",
    defaultAvailableStock: 280,
  },
  {
    id: "00000000-0000-0000-0000-000000000202",
    sku: "SKU-PACK-002",
    name: "Thùng Carton Đóng Hàng 5 Lớp",
    defaultAvailableStock: 600,
  },
];
