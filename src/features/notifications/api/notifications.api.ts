import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  markAllReadResponseSchema,
  notificationListResponseSchema,
  unreadCountSchema,
  type ListNotificationsParams,
  type MarkAllReadResponse,
  type NotificationListResponse,
  type UnreadCountResponse,
} from "../schemas/notification.schema";

const BASE_URL = `${apiBaseUrl}/notifications`;

export async function listNotificationsApi(
  params: ListNotificationsParams = {},
  signal?: AbortSignal,
): Promise<NotificationListResponse> {
  const query = toQueryString({
    cursor: params.cursor,
    limit: params.limit,
    unreadOnly: params.unreadOnly,
    includeArchived: params.includeArchived,
  });
  const response = await authFetch(`${BASE_URL}${query}`, {
    method: "GET",
    signal,
  });
  return notificationListResponseSchema.parse(
    await handleResponse<unknown>(response),
  );
}

export async function getUnreadCountApi(
  signal?: AbortSignal,
): Promise<UnreadCountResponse> {
  const response = await authFetch(`${BASE_URL}/unread-count`, {
    method: "GET",
    signal,
  });
  return unreadCountSchema.parse(await handleResponse<unknown>(response));
}

export async function markNotificationReadApi(id: string): Promise<void> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(id)}/read`,
    { method: "PATCH" },
  );
  if (!response.ok) {
    await handleResponse<void>(response);
  }
}

export async function markAllNotificationsReadApi(): Promise<MarkAllReadResponse> {
  const response = await authFetch(`${BASE_URL}/read-all`, {
    method: "POST",
  });
  return markAllReadResponseSchema.parse(
    await handleResponse<unknown>(response),
  );
}

export async function archiveNotificationApi(id: string): Promise<void> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(id)}/archive`,
    { method: "PATCH" },
  );
  if (!response.ok) {
    await handleResponse<void>(response);
  }
}
