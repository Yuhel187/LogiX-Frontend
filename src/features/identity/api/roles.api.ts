import { API_BASE_URL, authFetch, handleResponse } from "./auth.api";
import type {
  PermissionItem,
  RoleItem,
  CreateRoleFormValues,
  UpdateRoleFormValues,
} from "../schemas/role.schema";

/**
 * 1. Lấy toàn bộ danh mục quyền hệ thống đã định chuẩn
 */
export async function getAllPermissionsApi(accessToken?: string): Promise<PermissionItem[]> {
  const response = await authFetch(`${API_BASE_URL}/iam/permissions`, {
    method: "GET",
    accessToken,
  });
  return handleResponse<PermissionItem[]>(response);
}

/**
 * 2. Lấy danh sách các vai trò của tổ chức
 */
export async function getRolesApi(
  tenantId?: string,
  accessToken?: string
): Promise<RoleItem[]> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/roles`, {
    method: "GET",
    headers,
    accessToken,
  });
  return handleResponse<RoleItem[]>(response);
}

/**
 * 3. Lấy thông tin chi tiết một vai trò kèm danh sách quyền được cấp
 */
export async function getRoleByIdApi(
  roleId: string,
  tenantId?: string,
  accessToken?: string
): Promise<RoleItem> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/roles/${roleId}`, {
    method: "GET",
    headers,
    accessToken,
  });
  return handleResponse<RoleItem>(response);
}

/**
 * 4. Tạo vai trò mới cho tổ chức (Custom Role)
 */
export async function createRoleApi(
  dto: CreateRoleFormValues,
  tenantId?: string,
  accessToken?: string
): Promise<RoleItem> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/roles`, {
    method: "POST",
    headers,
    body: JSON.stringify(dto),
    accessToken,
  });
  return handleResponse<RoleItem>(response);
}

/**
 * 5. Cập nhật thông tin cơ bản của vai trò (Tên, mô tả)
 */
export async function updateRoleApi(
  roleId: string,
  dto: UpdateRoleFormValues,
  tenantId?: string,
  accessToken?: string
): Promise<RoleItem> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/roles/${roleId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(dto),
    accessToken,
  });
  return handleResponse<RoleItem>(response);
}

/**
 * 6. Xóa vai trò tùy biến (Chặn vai trò hệ thống và vai trò đang có thành viên)
 */
export async function deleteRoleApi(
  roleId: string,
  tenantId?: string,
  accessToken?: string
): Promise<{ success: boolean; message: string }> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/roles/${roleId}`, {
    method: "DELETE",
    headers,
    accessToken,
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

/**
 * 7. Cập nhật ma trận quyền hạn cho vai trò
 */
export async function updateRolePermissionsApi(
  roleId: string,
  permissionIds: string[],
  tenantId?: string,
  accessToken?: string
): Promise<{ success: boolean; message: string; permissionCount: number }> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/roles/${roleId}/permissions`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ permissionIds }),
    accessToken,
  });
  return handleResponse<{ success: boolean; message: string; permissionCount: number }>(response);
}

/**
 * 8. Lấy danh sách thành viên kèm danh sách vai trò
 */
export async function getMembersApi(
  tenantId?: string,
  accessToken?: string
): Promise<any[]> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/members`, {
    method: "GET",
    headers,
    accessToken,
  });
  return handleResponse<any[]>(response);
}

/**
 * 9. Gán danh sách vai trò cho thành viên
 */
export async function assignMemberRolesApi(
  userId: string,
  roleIds: string[],
  tenantId?: string,
  accessToken?: string
): Promise<any> {
  const headers: Record<string, string> = {};
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  const response = await authFetch(`${API_BASE_URL}/iam/members/${userId}/roles`, {
    method: "POST",
    headers,
    body: JSON.stringify({ roleIds }),
    accessToken,
  });
  return handleResponse<any>(response);
}
