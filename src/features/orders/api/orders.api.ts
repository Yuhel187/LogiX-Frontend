import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  orderDetailSchema,
  orderHistoryEntrySchema,
  orderPageSchema,
  confirmationPreviewSchema,
  orderShortageSchema,
  type ConfirmationPreview,
  type OrderShortage,
  type CancelOrderInput,
  type CreateOrderInput,
  type ListOrdersParams,
  type OrderDetail,
  type OrderHistoryEntry,
  type OrderPage,
  type UpdateOrderInput,
} from "../schemas/order.schema";

const BASE_URL = `${apiBaseUrl}/orders`;

const orderHistorySchema = orderHistoryEntrySchema.array();

export async function listOrdersApi(
  params: ListOrdersParams = {},
  signal?: AbortSignal
): Promise<OrderPage> {
  const query = toQueryString({
    q: params.q,
    customerId: params.customerId,
    warehouseId: params.warehouseId,
    // The backend accepts a comma-separated status list.
    status: params.statuses?.length ? params.statuses.join(",") : undefined,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    page: params.page,
    pageSize: params.pageSize,
  });
  const response = await authFetch(`${BASE_URL}${query}`, { method: "GET", signal });
  return orderPageSchema.parse(await handleResponse<unknown>(response));
}

export async function getOrderApi(id: string): Promise<OrderDetail> {
  const response = await authFetch(`${BASE_URL}/${id}`, { method: "GET" });
  return orderDetailSchema.parse(await handleResponse<unknown>(response));
}

export async function getOrderHistoryApi(
  id: string
): Promise<OrderHistoryEntry[]> {
  const response = await authFetch(`${BASE_URL}/${id}/history`, {
    method: "GET",
  });
  return orderHistorySchema.parse(await handleResponse<unknown>(response));
}

/**
 * The key must stay the same across retries of one submission so the backend
 * returns the original order instead of creating a duplicate.
 */
export async function createOrderApi(
  input: CreateOrderInput,
  idempotencyKey: string
): Promise<OrderDetail> {
  const response = await authFetch(BASE_URL, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
  return orderDetailSchema.parse(await handleResponse<unknown>(response));
}

export async function updateOrderApi(
  id: string,
  input: UpdateOrderInput
): Promise<OrderDetail> {
  const response = await authFetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return orderDetailSchema.parse(await handleResponse<unknown>(response));
}

export async function cancelOrderApi(
  id: string,
  input: CancelOrderInput
): Promise<OrderDetail> {
  const response = await authFetch(`${BASE_URL}/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return orderDetailSchema.parse(await handleResponse<unknown>(response));
}

export async function getConfirmationPreviewApi(id: string): Promise<ConfirmationPreview> {
  const response = await authFetch(`${BASE_URL}/${id}/confirm-preview`, { method: "GET" });
  return confirmationPreviewSchema.parse(await handleResponse<unknown>(response));
}

export async function getOrderShortagesApi(id: string): Promise<OrderShortage[]> {
  const response = await authFetch(`${BASE_URL}/${id}/shortages`, { method: "GET" });
  return orderShortageSchema.array().parse(await handleResponse<unknown>(response));
}

export async function confirmOrderApi(id: string, version: number, retry = false): Promise<OrderDetail> {
  const response = await authFetch(`${BASE_URL}/${id}/${retry ? "retry-reservation" : "confirm"}`, {
    method: "POST", body: JSON.stringify({ version }),
  });
  return orderDetailSchema.parse(await handleResponse<unknown>(response));
}
