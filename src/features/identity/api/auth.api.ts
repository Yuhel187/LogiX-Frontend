import {
  authResponseSchema,
  effectivePermissionsSchema,
  type AuthResponse,
  type EffectivePermissions,
  type LoginCredentials,
  type RegisterData,
  type ForgotPasswordData,
  type ResetPasswordData,
  type SwitchTenantData,
  type CreateOrganizationData,
  type UpdateOrganizationData,
  type OrganizationDetail,
  type TenantListItem,
  type UpdateProfileData,
  type ChangePasswordData,
  type UserSession,
  type OrgMember,
} from "../schemas/auth.schema";
import {
  authFetch,
  handleResponse,
  registerSessionHandlers,
  setStoredAccessToken,
} from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";

export {
  authFetch,
  getStoredAccessToken,
  requestNewAccessToken,
  setStoredAccessToken,
  type AuthFetchOptions,
  handleResponse,
} from "@/lib/api";

export const API_BASE_URL = apiBaseUrl;

type OnTokenRefreshedCallback = (token: string, data: AuthResponse) => void;
type OnSessionExpiredCallback = () => void;

let onTokenRefreshedCallback: OnTokenRefreshedCallback | null = null;
let onSessionExpiredCallback: OnSessionExpiredCallback | null = null;

export function registerAuthCallbacks(callbacks: {
  onTokenRefreshed?: OnTokenRefreshedCallback;
  onSessionExpired?: OnSessionExpiredCallback;
}) {
  if (callbacks.onTokenRefreshed) {
    onTokenRefreshedCallback = callbacks.onTokenRefreshed;
  }
  if (callbacks.onSessionExpired) {
    onSessionExpiredCallback = callbacks.onSessionExpired;
  }
}

// =======================================================
// SESSION REFRESH (domain implementation injected into the transport)
// =======================================================
registerSessionHandlers({
  refreshSession: async () => {
    const res = await refreshApi();
    const newToken = res.accessToken;
    setStoredAccessToken(newToken);

    let activeTenantData = res.activeTenant;
    let tenantListData = res.tenants;

    if (!activeTenantData || !tenantListData || tenantListData.length === 0) {
      try {
        const profile = await getProfileApi(newToken);
        activeTenantData = profile.activeTenant || activeTenantData;
        tenantListData = profile.tenants || tenantListData;
      } catch {
        // Ignore profile fetch failure
      }
    }

    const fullAuthResponse: AuthResponse = {
      ...res,
      activeTenant: activeTenantData,
      tenants: tenantListData,
    };

    if (onTokenRefreshedCallback) {
      onTokenRefreshedCallback(newToken, fullAuthResponse);
    }
    return newToken;
  },
  onSessionExpired: () => {
    if (onSessionExpiredCallback) {
      onSessionExpiredCallback();
    }
  },
});

// =======================================================
// AUTH ENDPOINTS
// =======================================================
export async function loginApi(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  const data = await handleResponse<unknown>(response);
  const parsed = authResponseSchema.parse(data);
  setStoredAccessToken(parsed.accessToken);
  return parsed;
}

export async function registerApi(data: RegisterData): Promise<{ id: string; email: string; displayName: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function forgotPasswordApi(data: ForgotPasswordData): Promise<{ message: string; devToken?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function resetPasswordApi(data: ResetPasswordData): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function refreshApi(refreshToken?: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });

  const data = await handleResponse<unknown>(response);
  return authResponseSchema.parse(data);
}

export async function logoutApi(): Promise<{ message: string }> {
  const response = await authFetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    skipAuthRefresh: true,
    body: JSON.stringify({}),
  });

  setStoredAccessToken(null);
  return handleResponse(response);
}

export async function getProfileApi(accessToken?: string): Promise<{
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  status: string;
  isSuperAdmin?: boolean;
  lastLoginAt?: string | null;
  activeTenant?: { id: string; code: string; name: string; logoUrl?: string | null; role: string } | null;
  tenants: Array<{ id: string; code: string; name: string; logoUrl?: string | null; role: string; isDefault: boolean }>;
}> {
  const response = await authFetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    accessToken,
  });

  return handleResponse(response);
}

export async function getEffectivePermissionsApi(
  accessToken?: string
): Promise<EffectivePermissions> {
  const response = await authFetch(`${API_BASE_URL}/auth/me/permissions`, {
    method: "GET",
    accessToken,
    skipAuthRefresh: true,
  });

  const data = await handleResponse<unknown>(response);
  return effectivePermissionsSchema.parse(data);
}

export async function switchTenantApi(
  data: SwitchTenantData,
  accessToken?: string
): Promise<{ accessToken: string; activeTenant: { id: string; code: string; name: string; logoUrl?: string | null; role: string } }> {
  const response = await authFetch(`${API_BASE_URL}/auth/switch-tenant`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(data),
  });

  const res = await handleResponse<{ accessToken: string; activeTenant: { id: string; code: string; name: string; logoUrl?: string | null; role: string } }>(response);
  setStoredAccessToken(res.accessToken);
  return res;
}

export async function createOrganizationApi(
  data: CreateOrganizationData,
  accessToken?: string
): Promise<{ id: string; code: string; name: string; role: string; isDefault: boolean; message: string }> {
  const response = await authFetch(`${API_BASE_URL}/auth/organizations`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function updateProfileApi(
  data: UpdateProfileData,
  accessToken?: string
): Promise<{ id: string; email: string; displayName: string; phoneNumber?: string | null; avatarUrl?: string | null; message: string }> {
  const response = await authFetch(`${API_BASE_URL}/auth/me`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function getTenantsApi(accessToken?: string): Promise<TenantListItem[]> {
  const response = await authFetch(`${API_BASE_URL}/auth/tenants`, {
    method: "GET",
    accessToken,
  });

  return handleResponse(response);
}

export async function getOrganizationApi(
  tenantId: string,
  accessToken?: string
): Promise<OrganizationDetail> {
  const response = await authFetch(`${API_BASE_URL}/auth/organizations/${tenantId}`, {
    method: "GET",
    accessToken,
  });

  return handleResponse(response);
}

export async function updateOrganizationApi(
  tenantId: string,
  data: UpdateOrganizationData,
  accessToken?: string
): Promise<{ id: string; code: string; name: string; logoUrl?: string | null; role: string; isDefault: boolean; message: string }> {
  const response = await authFetch(`${API_BASE_URL}/auth/organizations/${tenantId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function setDefaultTenantApi(
  tenantId: string,
  accessToken?: string
): Promise<{ tenantId: string; isDefault: boolean; message: string }> {
  const response = await authFetch(`${API_BASE_URL}/auth/organizations/${tenantId}/set-default`, {
    method: "POST",
    accessToken,
  });

  return handleResponse(response);
}

export async function getOrganizationMembersApi(
  tenantId: string,
  accessToken?: string
): Promise<OrgMember[]> {
  const response = await authFetch(
    `${API_BASE_URL}/auth/organizations/${tenantId}/members`,
    {
      method: "GET",
      accessToken,
    }
  );

  return handleResponse(response);
}

export async function updateMemberRoleApi(
  tenantId: string,
  memberId: string,
  role: "OWNER" | "ADMIN" | "MEMBER",
  accessToken?: string
): Promise<{ id: string; role: string; message: string }> {
  const response = await authFetch(
    `${API_BASE_URL}/auth/organizations/${tenantId}/members/${memberId}/role`,
    {
      method: "PATCH",
      accessToken,
      body: JSON.stringify({ role }),
    }
  );

  return handleResponse(response);
}

export async function removeMemberApi(
  tenantId: string,
  memberId: string,
  accessToken?: string
): Promise<{ id: string; message: string }> {
  const response = await authFetch(
    `${API_BASE_URL}/auth/organizations/${tenantId}/members/${memberId}`,
    {
      method: "DELETE",
      accessToken,
    }
  );

  return handleResponse(response);
}

export async function deleteOrganizationApi(
  tenantId: string,
  accessToken?: string
): Promise<{ message: string }> {
  const response = await authFetch(`${API_BASE_URL}/auth/organizations/${tenantId}`, {
    method: "DELETE",
    accessToken,
  });

  return handleResponse(response);
}

export async function deleteAccountApi(
  accessToken?: string
): Promise<{ message: string }> {
  const response = await authFetch(`${API_BASE_URL}/auth/me`, {
    method: "DELETE",
    accessToken,
  });

  setStoredAccessToken(null);
  return handleResponse(response);
}

export async function changePasswordApi(
  data: ChangePasswordData,
  accessToken?: string
): Promise<{ message: string; revokedOthersCount?: number }> {
  const { currentPassword, newPassword, revokeOtherSessions } = data;
  const response = await authFetch(`${API_BASE_URL}/auth/change-password`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions }),
  });

  return handleResponse(response);
}

export async function getActiveSessionsApi(
  accessToken?: string
): Promise<UserSession[]> {
  const response = await authFetch(`${API_BASE_URL}/auth/sessions`, {
    method: "GET",
    accessToken,
  });

  return handleResponse(response);
}

export async function revokeSessionApi(
  sessionId: string,
  accessToken?: string
): Promise<{ message: string }> {
  const response = await authFetch(`${API_BASE_URL}/auth/sessions/${sessionId}`, {
    method: "DELETE",
    accessToken,
  });

  return handleResponse(response);
}

export async function revokeOtherSessionsApi(
  refreshToken?: string,
  accessToken?: string
): Promise<{ message: string; count?: number }> {
  const response = await authFetch(`${API_BASE_URL}/auth/sessions/revoke-others`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ refreshToken }),
  });

  return handleResponse(response);
}