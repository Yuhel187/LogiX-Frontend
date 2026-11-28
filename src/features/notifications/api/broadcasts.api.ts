import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  broadcastHistoryItemSchema,
  broadcastListResponseSchema,
  canonicalizeBroadcastAudience,
  createBroadcastResponseSchema,
  normalizeBroadcastLink,
  type BroadcastHistoryItem,
  type BroadcastListResponse,
  type CreateBroadcastPayload,
  type CreateBroadcastResponse,
  type ListBroadcastsParams,
} from "../schemas/broadcast.schema";

const BROADCASTS_BASE_URL = `${apiBaseUrl}/notifications/admin/broadcasts`;

export interface CreateBroadcastRequestOptions {
  idempotencyKey: string;
  correlationId?: string;
  signal?: AbortSignal;
}

export async function createBroadcastApi(
  payload: CreateBroadcastPayload,
  options: CreateBroadcastRequestOptions,
): Promise<CreateBroadcastResponse> {
  const normalizedLink = normalizeBroadcastLink(payload.link);
  const requestBody: Record<string, unknown> = {
    title: payload.title.trim(),
    body: payload.body.trim(),
    severity: payload.severity,
    audience: canonicalizeBroadcastAudience(payload.audience),
  };

  if (normalizedLink !== null) {
    requestBody.link = normalizedLink;
  }

  const headers: Record<string, string> = {
    "Idempotency-Key": options.idempotencyKey,
  };
  if (options.correlationId) {
    headers["X-Correlation-ID"] = options.correlationId;
  }

  const response = await authFetch(BROADCASTS_BASE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
    signal: options.signal,
  });

  return createBroadcastResponseSchema.parse(
    await handleResponse<unknown>(response),
  );
}

export async function listBroadcastsApi(
  params: ListBroadcastsParams = {},
  signal?: AbortSignal,
): Promise<BroadcastListResponse> {
  const query = toQueryString({
    cursor: params.cursor,
    limit: params.limit,
  });
  const response = await authFetch(`${BROADCASTS_BASE_URL}${query}`, {
    method: "GET",
    signal,
  });
  return broadcastListResponseSchema.parse(
    await handleResponse<unknown>(response),
  );
}

export async function getBroadcastByIdApi(
  id: string,
  signal?: AbortSignal,
): Promise<BroadcastHistoryItem> {
  const response = await authFetch(
    `${BROADCASTS_BASE_URL}/${encodeURIComponent(id)}`,
    {
      method: "GET",
      signal,
    },
  );
  return broadcastHistoryItemSchema.parse(
    await handleResponse<unknown>(response),
  );
}
