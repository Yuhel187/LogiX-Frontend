import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  paginatedWarehousesSchema,
  warehouseSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
  type Warehouse,
} from "../schemas/warehouse.schema";
import type { Paginated } from "../schemas/common.schema";
import type { MasterDataQueryParams } from "../types/master-data.types";
import { invalidateMasterDataCache } from "../utils/master-data-cache";
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
    body: JSON.stringify(stripBlanks(createWarehouseSchema.parse(input))),
  });
  const created = warehouseSchema.parse(await handleResponse<unknown>(response));
  invalidateMasterDataCache();
  return created;
}

export async function updateWarehouseApi(
  id: string,
  input: UpdateWarehouseInput
): Promise<Warehouse> {
  const response = await authFetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(stripBlanks(updateWarehouseSchema.parse(input))),
  });
  const updated = warehouseSchema.parse(await handleResponse<unknown>(response));
  invalidateMasterDataCache();
  return updated;
}

export async function setWarehouseStatusApi(
  id: string,
  action: "disable" | "enable"
): Promise<Warehouse> {
  const response = await authFetch(`${BASE_URL}/${id}/${action}`, {
    method: "POST",
  });
  const updated = warehouseSchema.parse(await handleResponse<unknown>(response));
  invalidateMasterDataCache();
  return updated;
}
