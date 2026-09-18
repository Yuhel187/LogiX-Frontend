import {
  authResponseSchema,
  type AuthResponse,
  type LoginCredentials,
  type RegisterData,
  type ForgotPasswordData,
  type ResetPasswordData,
  type SwitchTenantData,
  type CreateOrganizationData,
  type UpdateProfileData,
} from "../schemas/auth.schema";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.message ||
      (Array.isArray(data.message) ? data.message.join(", ") : null) ||
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";
    throw new Error(message);
  }

  return data as T;
}

export async function loginApi(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  const data = await handleResponse<unknown>(response);
  return authResponseSchema.parse(data);
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
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });

  return handleResponse(response);
}

export async function getProfileApi(accessToken?: string): Promise<{
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  status: string;
  lastLoginAt?: string | null;
  activeTenant?: { id: string; code: string; name: string; logoUrl?: string | null; role: string } | null;
  tenants: Array<{ id: string; code: string; name: string; logoUrl?: string | null; role: string; isDefault: boolean }>;
}> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  return handleResponse(response);
}

export async function switchTenantApi(
  data: SwitchTenantData,
  accessToken?: string
): Promise<{ accessToken: string; activeTenant: { id: string; code: string; name: string; logoUrl?: string | null; role: string } }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/auth/switch-tenant`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function createOrganizationApi(
  data: CreateOrganizationData,
  accessToken?: string
): Promise<{ id: string; code: string; name: string; role: string; isDefault: boolean; message: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/auth/organizations`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function updateProfileApi(
  data: UpdateProfileData,
  accessToken?: string
): Promise<{ id: string; email: string; displayName: string; phoneNumber?: string | null; avatarUrl?: string | null; message: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}
