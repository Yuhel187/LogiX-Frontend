"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  loginApi,
  registerApi,
  forgotPasswordApi,
  resetPasswordApi,
  refreshApi,
  logoutApi,
  getProfileApi,
  getTenantsApi,
  switchTenantApi,
  createOrganizationApi,
  updateOrganizationApi,
  setDefaultTenantApi,
  updateProfileApi,
} from "@/features/identity/api/auth.api";
import type {
  AuthUser,
  ActiveTenant,
  TenantListItem,
  LoginCredentials,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  CreateOrganizationData,
  UpdateOrganizationData,
  UpdateProfileData,
} from "@/features/identity/schemas/auth.schema";

interface AuthContextType {
  user: AuthUser | null;
  activeTenant: ActiveTenant | null;
  tenants: TenantListItem[];
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<{ id: string; email: string; displayName: string; message: string }>;
  forgotPassword: (data: ForgotPasswordData) => Promise<{ message: string; devToken?: string }>;
  resetPassword: (data: ResetPasswordData) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  createOrganization: (data: CreateOrganizationData) => Promise<{ id: string; code: string; name: string; role: string; isDefault: boolean; message: string } | undefined>;
  updateOrganization: (tenantId: string, data: UpdateOrganizationData) => Promise<void>;
  setDefaultTenant: (tenantId: string) => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = "logix_access_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTenant, setActiveTenant] = useState<ActiveTenant | null>(null);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to apply auth session data
  const applyAuthData = useCallback(
    (
      token: string,
      userData: AuthUser,
      tenantData?: ActiveTenant | null,
      tenantList: TenantListItem[] = []
    ) => {
      setAccessToken(token);
      setUser(userData);
      if (tenantData !== undefined) {
        setActiveTenant(tenantData);
      }
      setTenants(tenantList);
      try {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      } catch {
        // Ignore storage errors
      }
    },
    []
  );

  // Clear auth session data
  const clearAuthData = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setActiveTenant(null);
    setTenants([]);
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Refresh session from server (via HttpOnly refresh token cookie)
  const refreshSession = useCallback(async () => {
    try {
      const res = await refreshApi();
      let activeTenantData = res.activeTenant;
      let tenantListData = res.tenants;

      // Luôn đảm bảo lấy đầy đủ activeTenant và danh sách tenants
      if (!activeTenantData || !tenantListData || tenantListData.length === 0) {
        try {
          const profile = await getProfileApi(res.accessToken);
          activeTenantData = profile.activeTenant || activeTenantData;
          tenantListData = profile.tenants || tenantListData;
        } catch {
          // Ignore profile fetch failure
        }
      }

      applyAuthData(res.accessToken, res.user, activeTenantData, tenantListData);
    } catch {
      // If refresh fails, try restoring with stored token or clear
      try {
        const storedToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        if (storedToken) {
          const profile = await getProfileApi(storedToken);
          applyAuthData(
            storedToken,
            {
              id: profile.id,
              email: profile.email,
              displayName: profile.displayName,
              phoneNumber: profile.phoneNumber,
              avatarUrl: profile.avatarUrl,
            },
            profile.activeTenant,
            profile.tenants
          );
          return;
        }
      } catch {
        // Ignore
      }
      clearAuthData();
    }
  }, [applyAuthData, clearAuthData]);

  // Initial session restoration on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await refreshSession();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  // Login action
  const login = async (credentials: LoginCredentials) => {
    const res = await loginApi(credentials);
    applyAuthData(res.accessToken, res.user, res.activeTenant, res.tenants);
  };

  // Register action
  const register = async (data: RegisterData) => {
    return registerApi(data);
  };

  // Forgot password action
  const forgotPassword = async (data: ForgotPasswordData) => {
    return forgotPasswordApi(data);
  };

  // Reset password action
  const resetPassword = async (data: ResetPasswordData) => {
    return resetPasswordApi(data);
  };

  // Logout action
  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      clearAuthData();
    }
  };

  // Switch tenant action
  const switchTenant = async (tenantId: string) => {
    if (!accessToken) return;
    const res = await switchTenantApi({ tenantId }, accessToken);
    setAccessToken(res.accessToken);
    setActiveTenant(res.activeTenant);
    try {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    } catch {
      // Ignore
    }
    // Fetch updated tenant list with new token
    try {
      const updatedTenants = await getTenantsApi(res.accessToken);
      setTenants(updatedTenants);
    } catch {
      // Fallback: refresh profile
      const profile = await getProfileApi(res.accessToken);
      setTenants(profile.tenants);
    }
  };

  // Create organization action
  const createOrganization = async (data: CreateOrganizationData) => {
    if (!accessToken) return;
    const newOrg = await createOrganizationApi(data, accessToken);
    // Automatically set and switch to the newly created organization on the UI
    if (newOrg?.id) {
      await switchTenant(newOrg.id);
      return newOrg;
    }
    // Fallback: Refresh profile to get updated tenant list
    const profile = await getProfileApi(accessToken);
    setUser({
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      phoneNumber: profile.phoneNumber,
      avatarUrl: profile.avatarUrl,
    });
    if (profile.activeTenant) {
      setActiveTenant(profile.activeTenant);
    }
    setTenants(profile.tenants);
    return newOrg;
  };

  // Update organization action
  const updateOrganization = async (tenantId: string, data: UpdateOrganizationData) => {
    if (!accessToken) return;
    const res = await updateOrganizationApi(tenantId, data, accessToken);
    // Update tenants list
    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId
          ? {
            ...t,
            name: res.name || t.name,
            logoUrl: res.logoUrl !== undefined ? res.logoUrl : t.logoUrl,
          }
          : t
      )
    );
    // Update active tenant if matching
    setActiveTenant((prev) => {
      if (prev && prev.id === tenantId) {
        return {
          ...prev,
          name: res.name || prev.name,
          logoUrl: res.logoUrl !== undefined ? res.logoUrl : prev.logoUrl,
        };
      }
      return prev;
    });
  };

  // Set default tenant action
  const setDefaultTenant = async (tenantId: string) => {
    if (!accessToken) return;
    await setDefaultTenantApi(tenantId, accessToken);
    setTenants((prev) =>
      prev.map((t) => ({
        ...t,
        isDefault: t.id === tenantId,
      }))
    );
  };

  // Update profile action
  const updateProfile = async (data: UpdateProfileData) => {
    if (!accessToken) return;
    const res = await updateProfileApi(data, accessToken);
    setUser((prev) =>
      prev
        ? {
          ...prev,
          displayName: res.displayName,
          phoneNumber: res.phoneNumber ?? prev.phoneNumber,
          avatarUrl: res.avatarUrl ?? prev.avatarUrl,
        }
        : null
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeTenant,
        tenants,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        forgotPassword,
        resetPassword,
        logout,
        switchTenant,
        createOrganization,
        updateOrganization,
        setDefaultTenant,
        updateProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
