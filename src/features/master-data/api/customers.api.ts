import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  customerAddressListSchema,
  customerAddressSchema,
  customerSchema,
  paginatedCustomersSchema,
  type CreateCustomerAddressInput,
  type CreateCustomerInput,
  type Customer,
  type CustomerAddress,
  type UpdateCustomerAddressInput,
  type UpdateCustomerInput,
} from "../schemas/customer.schema";
import type { Paginated } from "../schemas/common.schema";
import type { MasterDataQueryParams } from "../types/master-data.types";
import { stripBlanks } from "./request";

const BASE_URL = `${apiBaseUrl}/customers`;

export async function listCustomersApi(
  params: MasterDataQueryParams = {}
): Promise<Paginated<Customer>> {
  const query = toQueryString({
    q: params.q,
    status: params.status,
    page: params.page,
    pageSize: params.pageSize,
  });
  const response = await authFetch(`${BASE_URL}${query}`, { method: "GET" });
  return paginatedCustomersSchema.parse(await handleResponse<unknown>(response));
}

export async function getCustomerApi(id: string): Promise<Customer> {
  const response = await authFetch(`${BASE_URL}/${id}`, { method: "GET" });
  return customerSchema.parse(await handleResponse<unknown>(response));
}

export async function createCustomerApi(
  input: CreateCustomerInput
): Promise<Customer> {
  const response = await authFetch(BASE_URL, {
    method: "POST",
    body: JSON.stringify(stripBlanks(input)),
  });
  return customerSchema.parse(await handleResponse<unknown>(response));
}

export async function updateCustomerApi(
  id: string,
  input: UpdateCustomerInput
): Promise<Customer> {
  const response = await authFetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(stripBlanks(input)),
  });
  return customerSchema.parse(await handleResponse<unknown>(response));
}

/** Only the customer resource persists a disable reason. */
export async function disableCustomerApi(
  id: string,
  reason?: string
): Promise<Customer> {
  const response = await authFetch(`${BASE_URL}/${id}/disable`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
  return customerSchema.parse(await handleResponse<unknown>(response));
}

export async function enableCustomerApi(id: string): Promise<Customer> {
  const response = await authFetch(`${BASE_URL}/${id}/enable`, {
    method: "POST",
  });
  return customerSchema.parse(await handleResponse<unknown>(response));
}

// =======================================================
// DELIVERY ADDRESSES
// =======================================================
export async function listCustomerAddressesApi(
  customerId: string
): Promise<CustomerAddress[]> {
  const response = await authFetch(`${BASE_URL}/${customerId}/addresses`, {
    method: "GET",
  });
  return customerAddressListSchema.parse(
    await handleResponse<unknown>(response)
  );
}

export async function createCustomerAddressApi(
  customerId: string,
  input: CreateCustomerAddressInput
): Promise<CustomerAddress> {
  const response = await authFetch(`${BASE_URL}/${customerId}/addresses`, {
    method: "POST",
    body: JSON.stringify(stripBlanks(input)),
  });
  return customerAddressSchema.parse(await handleResponse<unknown>(response));
}

export async function updateCustomerAddressApi(
  customerId: string,
  addressId: string,
  input: UpdateCustomerAddressInput
): Promise<CustomerAddress> {
  const response = await authFetch(
    `${BASE_URL}/${customerId}/addresses/${addressId}`,
    { method: "PATCH", body: JSON.stringify(stripBlanks(input)) }
  );
  return customerAddressSchema.parse(await handleResponse<unknown>(response));
}

/** The server clears the previous default, so callers must refetch the list. */
export async function setDefaultCustomerAddressApi(
  customerId: string,
  addressId: string
): Promise<CustomerAddress> {
  const response = await authFetch(
    `${BASE_URL}/${customerId}/addresses/${addressId}/default`,
    { method: "POST" }
  );
  return customerAddressSchema.parse(await handleResponse<unknown>(response));
}

export async function setCustomerAddressStatusApi(
  customerId: string,
  addressId: string,
  action: "disable" | "enable"
): Promise<CustomerAddress> {
  const response = await authFetch(
    `${BASE_URL}/${customerId}/addresses/${addressId}/${action}`,
    { method: "POST" }
  );
  return customerAddressSchema.parse(await handleResponse<unknown>(response));
}
