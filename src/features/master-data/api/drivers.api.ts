import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import type { Paginated } from "../schemas/common.schema";
import {
  createDriverSchema,
  updateDriverSchema,
  driverSchema,
  driverRelinkPreviewSchema,
  relinkDriverUserSchema,
  paginatedDriversSchema,
  paginatedEligibleDriverUsersSchema,
  type CreateDriverInput,
  type Driver,
  type EligibleDriverUser,
  type UpdateDriverInput,
  type RelinkDriverUserInput,
  type DriverRelinkPreview,
} from "../schemas/driver.schema";
import type { MasterDataQueryParams } from "../types/master-data.types";
import { stripBlanks } from "./request";

const BASE_URL = `${apiBaseUrl}/drivers`;

export async function previewDriverRelinkApi(
  id: string,
  input: RelinkDriverUserInput,
  accessToken: string
): Promise<DriverRelinkPreview> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(id)}/relink-user/preview`,
    {
      method: "POST",
      body: JSON.stringify(relinkDriverUserSchema.parse(input)),
      accessToken,
      skipAuthRefresh: true,
    }
  );
  return driverRelinkPreviewSchema.parse(await handleResponse<unknown>(response));
}

export async function relinkDriverUserApi(
  id: string,
  input: RelinkDriverUserInput,
  accessToken: string
): Promise<Driver> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(id)}/relink-user`,
    {
      method: "POST",
      body: JSON.stringify(relinkDriverUserSchema.parse(input)),
      accessToken,
      skipAuthRefresh: true,
    }
  );
  return driverSchema.parse(await handleResponse<unknown>(response));
}

export async function listDriversApi(
  params: MasterDataQueryParams = {}
): Promise<Paginated<Driver>> {
  const query = toQueryString({
    q: params.q,
    status: params.status,
    page: params.page,
    pageSize: params.pageSize,
  });
  const response = await authFetch(`${BASE_URL}${query}`, { method: "GET" });
  return paginatedDriversSchema.parse(await handleResponse<unknown>(response));
}

export async function getDriverApi(id: string): Promise<Driver> {
  const response = await authFetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  return driverSchema.parse(await handleResponse<unknown>(response));
}

export async function createDriverApi(
  input: CreateDriverInput
): Promise<Driver> {
  const response = await authFetch(BASE_URL, {
    method: "POST",
    body: JSON.stringify(stripBlanks(createDriverSchema.parse(input))),
  });
  return driverSchema.parse(await handleResponse<unknown>(response));
}

export async function updateDriverApi(
  id: string,
  input: UpdateDriverInput
): Promise<Driver> {
  const payload = stripBlanks(updateDriverSchema.parse(input));
  if (input.phone === null) payload.phone = null;
  const response = await authFetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return driverSchema.parse(await handleResponse<unknown>(response));
}

export async function setDriverStatusApi(
  id: string,
  action: "enable" | "disable",
  version: number
): Promise<Driver> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(id)}/${action}`,
    {
      method: "POST",
      body: JSON.stringify({ version }),
    }
  );
  return driverSchema.parse(await handleResponse<unknown>(response));
}

export async function listEligibleDriverUsersApi(
  params: Pick<MasterDataQueryParams, "q" | "page" | "pageSize"> = {}
): Promise<Paginated<EligibleDriverUser>> {
  const query = toQueryString({
    q: params.q,
    page: params.page,
    pageSize: params.pageSize,
  });
  const response = await authFetch(`${BASE_URL}/eligible-users${query}`, {
    method: "GET",
  });
  return paginatedEligibleDriverUsersSchema.parse(
    await handleResponse<unknown>(response)
  );
}
