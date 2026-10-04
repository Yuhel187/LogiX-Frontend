import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  paginatedVehiclesSchema,
  vehicleSchema,
  type CreateVehicleInput,
  type UpdateVehicleInput,
  type Vehicle,
} from "../schemas/vehicle.schema";
import type { Paginated } from "../schemas/common.schema";
import type { MasterDataQueryParams } from "../types/master-data.types";
import { stripBlanks } from "./request";

const BASE_URL = `${apiBaseUrl}/vehicles`;

export async function listVehiclesApi(
  params: MasterDataQueryParams = {}
): Promise<Paginated<Vehicle>> {
  const query = toQueryString({
    q: params.q,
    status: params.status,
    page: params.page,
    pageSize: params.pageSize,
  });
  const response = await authFetch(`${BASE_URL}${query}`, { method: "GET" });
  return paginatedVehiclesSchema.parse(await handleResponse<unknown>(response));
}

export async function getVehicleApi(id: string): Promise<Vehicle> {
  const response = await authFetch(`${BASE_URL}/${id}`, { method: "GET" });
  return vehicleSchema.parse(await handleResponse<unknown>(response));
}

export async function createVehicleApi(
  input: CreateVehicleInput
): Promise<Vehicle> {
  const response = await authFetch(BASE_URL, {
    method: "POST",
    body: JSON.stringify(stripBlanks(input)),
  });
  return vehicleSchema.parse(await handleResponse<unknown>(response));
}

export async function updateVehicleApi(
  id: string,
  input: UpdateVehicleInput
): Promise<Vehicle> {
  const response = await authFetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(stripBlanks(input)),
  });
  return vehicleSchema.parse(await handleResponse<unknown>(response));
}

export async function setVehicleStatusApi(
  id: string,
  action: "disable" | "enable"
): Promise<Vehicle> {
  const response = await authFetch(`${BASE_URL}/${id}/${action}`, {
    method: "POST",
  });
  return vehicleSchema.parse(await handleResponse<unknown>(response));
}
