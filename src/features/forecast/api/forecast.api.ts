import {
  FORECAST_PRODUCTS,
  FORECAST_WAREHOUSES,
  type ForecastRunResult,
  type StockoutRisksResponse,
} from "../types";

const FORECAST_API_BASE =
  process.env.NEXT_PUBLIC_FORECAST_URL || "http://localhost:8002/api/v1";

export interface ForecastQueryParams {
  warehouseId: string;
  productId: string;
  horizonDays: number;
  availableStock?: number;
}

export async function triggerForecastRun(
  params: ForecastQueryParams
): Promise<ForecastRunResult> {
  const warehouse =
    FORECAST_WAREHOUSES.find((w) => w.id === params.warehouseId) ??
    FORECAST_WAREHOUSES[0];
  const product =
    FORECAST_PRODUCTS.find((p) => p.id === params.productId) ??
    FORECAST_PRODUCTS[0];
  const availableStock = params.availableStock ?? product.defaultAvailableStock;

  const res = await fetch(`${FORECAST_API_BASE}/forecast/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      warehouse_id: warehouse.id,
      warehouse_name: warehouse.name,
      product_id: product.id,
      sku_code: product.sku,
      product_name: product.name,
      horizon_days: params.horizonDays,
      available_stock: availableStock,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Lỗi tính toán dự báo nhu cầu (${res.status}): ${errorText || res.statusText}`
    );
  }

  return (await res.json()) as ForecastRunResult;
}

export async function fetchStockoutRisks(
  warehouseId: string,
  horizonDays: number = 7
): Promise<StockoutRisksResponse> {
  const url = new URL(`${FORECAST_API_BASE}/forecast/stockout-risks`);
  url.searchParams.set("warehouse_id", warehouseId);
  url.searchParams.set("horizon_days", String(horizonDays));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Lỗi tải danh sách rủi ro tồn kho (${res.status}): ${errorText || res.statusText}`
    );
  }

  return (await res.json()) as StockoutRisksResponse;
}
