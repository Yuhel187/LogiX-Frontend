import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  paginatedWarehousesSchema,
  warehouseSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
  type Warehouse,
} from "../schemas/warehouse.schema";
import type { Paginated } from "../schemas/common.schema";
import type { MasterDataQueryParams } from "../types/master-data.types";
import { stripBlanks } from "./request";

const BASE_URL = `${apiBaseUrl}/warehouses`;

export async function listWarehousesApi(
  params: MasterDataQueryParams = {}
): Promise<Paginated<Warehouse>> {
  const query = toQueryString({
    q: params.q,
    status: params.status,
    page: params.page,
    pageSize: params.pageSize,
  });
  const response = await authFetch(`${BASE_URL}${query}`, { method: "GET" });
  return paginatedWarehousesSchema.parse(await handleResponse<unknown>(response));
}

export async function getWarehouseApi(id: string): Promise<Warehouse> {
  const response = await authFetch(`${BASE_URL}/${id}`, { method: "GET" });
  return warehouseSchema.parse(await handleResponse<unknown>(response));
}

export async function createWarehouseApi(
  input: CreateWarehouseInput
): Promise<Warehouse> {
  const response = await authFetch(BASE_URL, {
    method: "POST",
    body: JSON.stringify(stripBlanks(input)),
  });
  return warehouseSchema.parse(await handleResponse<unknown>(response));
}

export async function updateWarehouseApi(
  id: string,
  input: UpdateWarehouseInput
): Promise<Warehouse> {
  const response = await authFetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(stripBlanks(input)),
  });
  return warehouseSchema.parse(await handleResponse<unknown>(response));
}

export async function setWarehouseStatusApi(
  id: string,
  action: "disable" | "enable"
): Promise<Warehouse> {
  const response = await authFetch(`${BASE_URL}/${id}/${action}`, {
    method: "POST",
  });
  return warehouseSchema.parse(await handleResponse<unknown>(response));
}
