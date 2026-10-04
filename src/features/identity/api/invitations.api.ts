import { API_BASE_URL, authFetch, handleResponse } from "./auth.api";
import type {
  CreateInvitationFormValues,
  InvitationItem,
  InvitationPreview,
  AcceptInvitationFormValues,
} from "../schemas/invitation.schema";

/**
 * 1. Lấy danh sách lời mời của tổ chức (có thể lọc theo trạng thái)
 */
export async function getInvitationsApi(
  status?: string,
  tenantId?: string,
  accessToken?: string
): Promise<InvitationItem[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/invitations${query}`, {
    method: "GET",
    headers,
    accessToken,
  });
  return handleResponse<InvitationItem[]>(response);
}

/**
 * 2. Gửi lời mời mới kèm danh sách vai trò chỉ định trước
 */
export async function createInvitationApi(
  dto: CreateInvitationFormValues,
  tenantId?: string,
  accessToken?: string
): Promise<{ id: string; token: string; inviteLink: string; expiresAt: string }> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/invitations`, {
    method: "POST",
    headers,
    body: JSON.stringify(dto),
    accessToken,
  });
  return handleResponse<{ id: string; token: string; inviteLink: string; expiresAt: string }>(response);
}

/**
 * 3. Gửi lại lời mời (Gia hạn thêm 7 ngày và sinh token mới)
 */
export async function resendInvitationApi(
  invitationId: string,
  tenantId?: string,
  accessToken?: string
): Promise<{ id: string; token: string; inviteLink: string; expiresAt: string }> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/invitations/${invitationId}/resend`, {
    method: "POST",
    headers,
    accessToken,
  });
  return handleResponse<{ id: string; token: string; inviteLink: string; expiresAt: string }>(response);
}

/**
 * 4. Thu hồi lời mời (Vô hiệu hóa liên kết mời)
 */
export async function revokeInvitationApi(
  invitationId: string,
  tenantId?: string,
  accessToken?: string
): Promise<{ success: boolean; message: string }> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/invitations/${invitationId}/revoke`, {
    method: "POST",
    headers,
    accessToken,
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

/**
 * 5. Xóa lời mời khỏi danh sách quản lý
 */
export async function deleteInvitationApi(
  invitationId: string,
  tenantId?: string,
  accessToken?: string
): Promise<{ success: boolean; message: string }> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/invitations/${invitationId}`, {
    method: "DELETE",
    headers,
    accessToken,
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

/**
 * 6. Lấy thông tin preview công khai của liên kết mời (Public, không cần Access Token)
 */
export async function getPublicInvitationPreviewApi(
  token: string
): Promise<InvitationPreview> {
  const response = await fetch(`${API_BASE_URL}/auth/invitations/${token}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<InvitationPreview>(response);
}

/**
 * 7. Chấp nhận lời mời tham gia tổ chức
 */
export async function acceptPublicInvitationApi(
  token: string,
  dto: AcceptInvitationFormValues
): Promise<{
  accessToken: string;
  user: any;
  activeTenant: any;
  message: string;
}> {
  const response = await fetch(`${API_BASE_URL}/auth/invitations/${token}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });
  return handleResponse<{
    accessToken: string;
    user: any;
    activeTenant: any;
    message: string;
  }>(response);
}
