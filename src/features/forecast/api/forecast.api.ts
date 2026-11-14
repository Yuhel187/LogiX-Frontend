import { authFetch } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import type { ForecastRunResult, StockoutRisksResponse } from "../types";

const FORECAST_API_BASE =
  process.env.NEXT_PUBLIC_FORECAST_URL || `${apiBaseUrl}/forecast`;
const DIRECT_FALLBACK_URL = "http://localhost:8002/api/v1/forecast";

export interface ForecastQueryParams {
  warehouseId: string;
  productId: string;
  horizonDays: number;
  availableStock?: number;
  warehouseName?: string;
  skuCode?: string;
  productName?: string;
}

export async function triggerForecastRun(
  params: ForecastQueryParams
): Promise<ForecastRunResult> {
  if (!params.warehouseId || !params.productId) {
    throw new Error("Missing warehouseId or productId for forecast run");
  }

  const warehouseName = params.warehouseName ?? "";
  const skuCode = params.skuCode ?? "";
  const productName = params.productName ?? "";
  const availableStock = params.availableStock ?? 0;

  const endpoint = `${FORECAST_API_BASE}/runs`;
  const payload = {
    warehouse_id: params.warehouseId,
    warehouse_name: warehouseName,
    product_id: params.productId,
    sku_code: skuCode,
    product_name: productName,
    horizon_days: params.horizonDays,
    available_stock: availableStock,
  };

  let res: Response;
  try {
    res = await authFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  }

  // If Gateway returned 502 (e.g. gateway container not configured with forecast container url),
  // attempt direct fallback to forecast-service port 8002 if available
  if (res.status === 502 && !FORECAST_API_BASE.includes("8002")) {
    try {
      const directRes = await fetch(`${DIRECT_FALLBACK_URL}/runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (directRes.ok) {
        return (await directRes.json()) as ForecastRunResult;
      }
    } catch {
      // Fall through to original error response
    }
  }

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
  if (!warehouseId) {
    return {
      warehouse_id: "",
      checked_sku_count: 0,
      at_risk_count: 0,
      items: [],
    };
  }
  const isAbsolute =
    FORECAST_API_BASE.startsWith("http://") || FORECAST_API_BASE.startsWith("https://");
  const baseOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const fullBase = isAbsolute ? FORECAST_API_BASE : `${baseOrigin}${FORECAST_API_BASE}`;

  const url = new URL(`${fullBase}/stockout-risks`);
  url.searchParams.set("warehouse_id", warehouseId);
  url.searchParams.set("horizon_days", String(horizonDays));

  const targetUrl = isAbsolute
    ? url.toString()
    : `${FORECAST_API_BASE}/stockout-risks?${url.searchParams.toString()}`;

  let res: Response;
  try {
    res = await authFetch(targetUrl, {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  }

  // Fallback to direct port 8002 if gateway returns 502 Bad Gateway
  if (res.status === 502 && !FORECAST_API_BASE.includes("8002")) {
    try {
      const directUrl = `${DIRECT_FALLBACK_URL}/stockout-risks?warehouse_id=${encodeURIComponent(warehouseId)}&horizon_days=${encodeURIComponent(horizonDays)}`;
      const directRes = await fetch(directUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (directRes.ok) {
        return (await directRes.json()) as StockoutRisksResponse;
      }
    } catch {
      // Fall through
    }
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Lỗi tải danh sách rủi ro tồn kho (${res.status}): ${errorText || res.statusText}`
    );
  }

  return (await res.json()) as StockoutRisksResponse;
}
