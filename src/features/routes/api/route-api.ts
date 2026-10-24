import {
  mapProposedRouteToRoutePlan,
  type ProposedRouteBackendDTO,
  type RoutePlan,
} from "../types";

const ROUTE_API_BASE =
  process.env.NEXT_PUBLIC_ROUTE_OPTIMIZER_URL || "http://localhost:8003/api/v1";

export async function fetchSampleRoute(): Promise<RoutePlan> {
  const res = await fetch(`${ROUTE_API_BASE}/route-optimizations/sample`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Lỗi tải dữ liệu lộ trình (${res.status}): ${errorText}`);
  }

  const data: ProposedRouteBackendDTO = await res.json();
  return mapProposedRouteToRoutePlan(data);
}

export async function optimizeRoute(requestBody?: Record<string, unknown>): Promise<RoutePlan> {
  const res = await fetch(`${ROUTE_API_BASE}/route-optimizations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestBody || {}),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Lỗi tính toán tối ưu tuyến đường (${res.status}): ${errorText}`);
  }

  const data: ProposedRouteBackendDTO = await res.json();
  return mapProposedRouteToRoutePlan(data);
}

export async function getRouteById(runId: string): Promise<RoutePlan> {
  const res = await fetch(`${ROUTE_API_BASE}/route-optimizations/${runId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Lỗi tra cứu lộ trình (${res.status}): ${errorText}`);
  }

  const data: ProposedRouteBackendDTO = await res.json();
  return mapProposedRouteToRoutePlan(data);
}
