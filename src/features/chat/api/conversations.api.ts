import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  conversationDetailSchema,
  conversationListItemSchema,
  conversationPageSchema,
  updateConversationInputSchema,
  type ConversationDetail,
  type ConversationListItem,
  type ConversationPage,
  type ConversationStatus,
  type UpdateConversationInput,
} from "../schemas/conversation.schema";

const BASE_URL = `${apiBaseUrl}/agent/conversations`;

export type ListConversationsParams = {
  scope?: "org" | "mine";
  page?: number;
  pageSize?: number;
  userId?: string;
  status?: ConversationStatus;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function listConversationsApi(
  params: ListConversationsParams = {},
  signal?: AbortSignal,
): Promise<ConversationPage> {
  const response = await authFetch(`${BASE_URL}${toQueryString(params)}`, {
    method: "GET",
    signal,
  });
  return conversationPageSchema.parse(await handleResponse<unknown>(response));
}

export async function getConversationDetailApi(
  threadId: string,
  signal?: AbortSignal,
): Promise<ConversationDetail> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(threadId)}`,
    { method: "GET", signal },
  );
  return conversationDetailSchema.parse(await handleResponse<unknown>(response));
}

export async function updateConversationApi(
  threadId: string,
  input: UpdateConversationInput,
): Promise<ConversationListItem> {
  const body = updateConversationInputSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(threadId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return conversationListItemSchema.parse(
    await handleResponse<unknown>(response),
  );
}

export async function deleteConversationApi(threadId: string): Promise<void> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(threadId)}`,
    { method: "DELETE" },
  );
  if (response.status === 204) return;
  await handleResponse<unknown>(response);
}
