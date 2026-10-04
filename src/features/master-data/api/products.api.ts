import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  paginatedProductsSchema,
  productSchema,
  type CreateProductInput,
  type Product,
  type UpdateProductInput,
} from "../schemas/product.schema";
import type { Paginated } from "../schemas/common.schema";
import type { MasterDataQueryParams } from "../types/master-data.types";
import { stripBlanks } from "./request";

const BASE_URL = `${apiBaseUrl}/products`;

export async function listProductsApi(
  params: MasterDataQueryParams = {}
): Promise<Paginated<Product>> {
  const query = toQueryString({
    q: params.q,
    status: params.status,
    page: params.page,
    pageSize: params.pageSize,
  });
  const response = await authFetch(`${BASE_URL}${query}`, { method: "GET" });
  return paginatedProductsSchema.parse(await handleResponse<unknown>(response));
}

export async function getProductApi(id: string): Promise<Product> {
  const response = await authFetch(`${BASE_URL}/${id}`, { method: "GET" });
  return productSchema.parse(await handleResponse<unknown>(response));
}

export async function createProductApi(
  input: CreateProductInput
): Promise<Product> {
  const response = await authFetch(BASE_URL, {
    method: "POST",
    body: JSON.stringify(stripBlanks(input)),
  });
  return productSchema.parse(await handleResponse<unknown>(response));
}

export async function updateProductApi(
  id: string,
  input: UpdateProductInput
): Promise<Product> {
  const response = await authFetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(stripBlanks(input)),
  });
  return productSchema.parse(await handleResponse<unknown>(response));
}

export async function setProductStatusApi(
  id: string,
  action: "disable" | "enable"
): Promise<Product> {
  const response = await authFetch(`${BASE_URL}/${id}/${action}`, {
    method: "POST",
  });
  return productSchema.parse(await handleResponse<unknown>(response));
}
