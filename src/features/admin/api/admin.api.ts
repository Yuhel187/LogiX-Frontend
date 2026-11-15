import {
  ApiError,
  authFetch,
  getJson,
  handleResponse,
  toQueryString,
} from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  contactLeadPageSchema,
  contactLeadSchema,
  createContactLeadResponseSchema,
  organizationPageSchema,
  userPageSchema,
} from "../schemas/admin.schema";
import type {
  AdminQuery,
  ContactLead,
  ContactLeadPage,
  ContactLeadStatus,
  CreateContactLeadInput,
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

export async function listContactLeadsApi(
  query: AdminQuery,
  signal?: AbortSignal
): Promise<ContactLeadPage> {
  const data = await getJson(
    `${apiBaseUrl}/admin/contact-leads${toQueryString(query)}`,
    signal
  );
  const parsed = contactLeadPageSchema.safeParse(data);
  if (
    !parsed.success ||
    parsed.data.page !== query.page ||
    parsed.data.pageSize !== query.pageSize
  ) {
    throw new ApiError(
      200,
      "Invalid contact lead list response",
      "INVALID_RESPONSE"
    );
  }
  return parsed.data;
}

export async function submitContactLeadApi(
  input: CreateContactLeadInput
): Promise<{ id: string; status: ContactLeadStatus; createdAt: string }> {
  const payload = {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    ...(input.phoneNumber && input.phoneNumber.trim().length > 0
      ? { phoneNumber: input.phoneNumber.trim() }
      : {}),
    companyName: input.companyName.trim(),
    needs: input.needs,
    ...(input.needs.includes("OTHER") &&
    input.otherNeedDetail &&
    input.otherNeedDetail.trim().length > 0
      ? { otherNeedDetail: input.otherNeedDetail.trim() }
      : {}),
  };

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/auth/contact-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(0, "Network request failed", "NETWORK_ERROR");
  }

  const data = await handleResponse<unknown>(response);
  const parsed = createContactLeadResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(
      200,
      "Invalid contact lead response",
      "INVALID_RESPONSE"
    );
  }
  return parsed.data;
}

export async function updateContactLeadStatusApi(
  id: string,
  status: ContactLeadStatus
): Promise<ContactLead> {
  const response = await authFetch(
    `${apiBaseUrl}/admin/contact-leads/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
  const data = await handleResponse<unknown>(response);
  const parsed = contactLeadSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(
      200,
      "Invalid contact lead status response",
      "INVALID_RESPONSE"
    );
  }
  return parsed.data;
}

export async function sendContactLeadEmailApi(
  id: string,
  payload: { subject: string; message: string }
): Promise<ContactLead> {
  const response = await authFetch(
    `${apiBaseUrl}/admin/contact-leads/${encodeURIComponent(id)}/send-email`,
    {
      method: "POST",
      body: JSON.stringify({
        subject: payload.subject.trim(),
        message: payload.message.trim(),
      }),
    }
  );
  const data = await handleResponse<unknown>(response);
  const parsed = contactLeadSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(
      200,
      "Invalid contact lead email response",
      "INVALID_RESPONSE"
    );
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
