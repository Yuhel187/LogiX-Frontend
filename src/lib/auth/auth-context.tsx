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
  switchTenantApi,
  createOrganizationApi,
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
  createOrganization: (data: CreateOrganizationData) => Promise<void>;
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
      applyAuthData(res.accessToken, res.user, res.activeTenant, res.tenants);
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
    // Refresh full profile to update tenant list
    const profile = await getProfileApi(res.accessToken);
    setTenants(profile.tenants);
  };

  // Create organization action
  const createOrganization = async (data: CreateOrganizationData) => {
    if (!accessToken) return;
    await createOrganizationApi(data, accessToken);
    // Refresh profile to get updated tenant list
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
