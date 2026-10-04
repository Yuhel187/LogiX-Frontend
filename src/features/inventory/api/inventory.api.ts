import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  inventoryBalanceSchema,
  paginatedBalancesSchema,
  paginatedMovementsSchema,
  stockReceiptSchema,
  type AdjustStockInput,
  type CreateStockReceiptInput,
  type InventoryBalance,
  type Paginated,
  type StockMovement,
  type StockReceipt,
  type UpdateLowStockThresholdInput,
} from "../schemas/inventory.schema";
import type {
  BalanceQueryParams,
  MovementQueryParams,
} from "../types/inventory.types";

const INVENTORY_BASE_URL = `${apiBaseUrl}/inventory`;

export async function listBalancesApi(
  params: BalanceQueryParams = {}
): Promise<Paginated<InventoryBalance>> {
  const query = toQueryString({
    warehouseId: params.warehouseId,
    productId: params.productId,
    lowStockOnly: params.lowStockOnly ? true : undefined,
    page: params.page,
    pageSize: params.pageSize,
  });
  const response = await authFetch(`${INVENTORY_BASE_URL}/balances${query}`, {
    method: "GET",
  });
  const data = await handleResponse<unknown>(response);
  return paginatedBalancesSchema.parse(data);
}

export async function getBalanceApi(
  warehouseId: string,
  productId: string
): Promise<InventoryBalance> {
  const response = await authFetch(
    `${INVENTORY_BASE_URL}/balances/${warehouseId}/${productId}`,
    { method: "GET" }
  );
  const data = await handleResponse<unknown>(response);
  return inventoryBalanceSchema.parse(data);
}

export async function listMovementsApi(
  params: MovementQueryParams = {}
): Promise<Paginated<StockMovement>> {
  const query = toQueryString({
    warehouseId: params.warehouseId,
    productId: params.productId,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    page: params.page,
    pageSize: params.pageSize,
  });
  const response = await authFetch(`${INVENTORY_BASE_URL}/movements${query}`, {
    method: "GET",
  });
  const data = await handleResponse<unknown>(response);
  return paginatedMovementsSchema.parse(data);
}

export async function createStockReceiptApi(
  input: CreateStockReceiptInput,
  idempotencyKey: string
): Promise<StockReceipt> {
  const response = await authFetch(`${INVENTORY_BASE_URL}/receipts`, {
    method: "POST",
    body: JSON.stringify({ ...input, idempotencyKey }),
  });
  const data = await handleResponse<unknown>(response);
  return stockReceiptSchema.parse(data);
}

export async function adjustStockApi(
  warehouseId: string,
  productId: string,
  input: AdjustStockInput,
  idempotencyKey: string
): Promise<InventoryBalance> {
  const response = await authFetch(
    `${INVENTORY_BASE_URL}/balances/${warehouseId}/${productId}/adjust`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...input, idempotencyKey }),
    }
  );
  const data = await handleResponse<unknown>(response);
  return inventoryBalanceSchema.parse(data);
}

export async function updateLowStockThresholdApi(
  warehouseId: string,
  productId: string,
  input: UpdateLowStockThresholdInput
): Promise<InventoryBalance> {
  const response = await authFetch(
    `${INVENTORY_BASE_URL}/balances/${warehouseId}/${productId}/threshold`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  const data = await handleResponse<unknown>(response);
  return inventoryBalanceSchema.parse(data);
}
