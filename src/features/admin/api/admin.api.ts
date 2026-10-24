import { ApiError, getJson, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  organizationPageSchema,
  userPageSchema,
} from "../schemas/admin.schema";
import type {
  AdminQuery,
  OrganizationPage,
  UserPage,
} from "../types/admin.types";

export async function listOrganizationsApi(
  query: AdminQuery,
  signal?: AbortSignal
): Promise<OrganizationPage> {
  const data = await getJson(
    `${apiBaseUrl}/admin/organizations${toQueryString(query)}`,
    signal
  );
  const parsed = organizationPageSchema.safeParse(data);
  if (
    !parsed.success ||
    parsed.data.page !== query.page ||
    parsed.data.pageSize !== query.pageSize
  ) {
    throw new ApiError(
      200,
      "Invalid organization list response",
      "INVALID_RESPONSE"
    );
  }
  return parsed.data;
}

export async function listUsersApi(
  query: AdminQuery,
  signal?: AbortSignal
): Promise<UserPage> {
  const data = await getJson(
    `${apiBaseUrl}/admin/users${toQueryString(query)}`,
    signal
  );
  const parsed = userPageSchema.safeParse(data);
  if (
    !parsed.success ||
    parsed.data.page !== query.page ||
    parsed.data.pageSize !== query.pageSize
  ) {
    throw new ApiError(200, "Invalid user list response", "INVALID_RESPONSE");
  }
  return parsed.data;
}

export function adminErrorKey(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 401) return "admin.errors.unauthorized";
    if (cause.status === 403) return "admin.errors.forbidden";
    if (cause.status === 400) return "admin.errors.invalidQuery";
    if (cause.code === "INVALID_RESPONSE")
      return "admin.errors.invalidResponse";
    if (cause.code === "TIMEOUT") return "admin.errors.timeout";
    if (cause.code === "NETWORK_ERROR") return "admin.errors.network";
  }
  return "admin.errors.unavailable";
}
