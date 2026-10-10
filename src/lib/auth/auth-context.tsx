"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  loginApi,
  registerApi,
  forgotPasswordApi,
  resetPasswordApi,
  logoutApi,
  getProfileApi,
  getEffectivePermissionsApi,
  getTenantsApi,
  switchTenantApi,
  createOrganizationApi,
  updateOrganizationApi,
  setDefaultTenantApi,
  deleteOrganizationApi,
  leaveOrganizationApi,
  updateProfileApi,
  changePasswordApi,
  getStoredAccessToken,
  setStoredAccessToken,
  registerAuthCallbacks,
  requestNewAccessToken,
} from "@/features/identity/api/auth.api";
import { acceptPublicInvitationApi } from "@/features/identity/api/invitations.api";
import type { AcceptInvitationFormValues } from "@/features/identity/schemas/invitation.schema";
import type {
  AuthUser,
  ActiveTenant,
  TenantListItem,
  EffectivePermissions,
  LoginCredentials,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  CreateOrganizationData,
  UpdateOrganizationData,
  UpdateProfileData,
  ChangePasswordData,
} from "@/features/identity/schemas/auth.schema";

interface AuthContextType {
  user: AuthUser | null;
  activeTenant: ActiveTenant | null;
  tenants: TenantListItem[];
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Dynamic RBAC State
  permissions: string[];
  roles: string[];
  isSuperAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;

  // RBAC Helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;

  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<{ id: string; email: string; displayName: string; message: string }>;
  forgotPassword: (data: ForgotPasswordData) => Promise<{ message: string; devToken?: string }>;
  resetPassword: (data: ResetPasswordData) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  createOrganization: (data: CreateOrganizationData) => Promise<{ id: string; code: string; name: string; role: string; isDefault: boolean; message: string } | undefined>;
  updateOrganization: (tenantId: string, data: UpdateOrganizationData) => Promise<void>;
  setDefaultTenant: (tenantId: string) => Promise<void>;
  deleteOrganization: (tenantId: string) => Promise<{ message: string }>;
  leaveOrganization: (tenantId: string) => Promise<{ tenantId: string; message: string }>;
  acceptInvitation: (
    token: string,
    dto: AcceptInvitationFormValues
  ) => Promise<{ activeTenant: ActiveTenant | null; message: string }>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<{ message: string; revokedOthersCount?: number }>;
  updateCurrentUser: (partial: Partial<AuthUser>) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTenant, setActiveTenant] = useState<ActiveTenant | null>(null);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamic RBAC States
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const lastRefreshTimeRef = useRef<number>(0);

  useEffect(() => {
    lastRefreshTimeRef.current = Date.now();
  }, []);

  // RBAC Helpers
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (isSuperAdmin || isOwner) return true;
      if (permissions.includes("*")) return true;
      return permissions.includes(permission);
    },
    [isSuperAdmin, isOwner, permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      if (isSuperAdmin || isOwner) return true;
      if (permissions.includes("*")) return true;
      return perms.some((p) => permissions.includes(p));
    },
    [isSuperAdmin, isOwner, permissions]
  );

  const hasAllPermissions = useCallback(
    (perms: string[]): boolean => {
      if (isSuperAdmin || isOwner) return true;
      if (permissions.includes("*")) return true;
      return perms.every((p) => permissions.includes(p));
    },
    [isSuperAdmin, isOwner, permissions]
  );

  // Clear auth session data
  const clearAuthData = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setActiveTenant(null);
    setTenants([]);
    setPermissions([]);
    setRoles([]);
    setIsSuperAdmin(false);
    setIsOwner(false);
    setIsAdmin(false);
    setStoredAccessToken(null);
  }, []);

  // Sync effective permissions from server
  const syncEffectivePermissions = useCallback(
    async (token: string): Promise<EffectivePermissions | null> => {
      try {
        const eff = await getEffectivePermissionsApi(token);
        setPermissions(eff.permissions);
        setRoles(eff.roles);
        setIsSuperAdmin(eff.isSuperAdmin);
        setIsOwner(eff.isOwner);
        setIsAdmin(eff.isAdmin);
        return eff;
      } catch (err: unknown) {
        console.warn("Could not sync effective permissions:", err);
        // Nếu token không hợp lệ hoặc đã hết hạn, xóa sạch session để không bị kẹt token cũ
        const msg = err instanceof Error ? err.message : String(err || "");
        if (
          msg.includes("Phiên đăng nhập không hợp lệ") ||
          msg.includes("hết hạn") ||
          msg.includes("Unauthorized")
        ) {
          clearAuthData();
        }
        return null;
      }
    },
    [clearAuthData]
  );

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
      setIsSuperAdmin(Boolean(userData.isSuperAdmin));
      if (tenantData !== undefined) {
        setActiveTenant(tenantData);
        setIsOwner(tenantData?.role === "OWNER");
        setIsAdmin(tenantData?.role === "OWNER" || tenantData?.role === "ADMIN");
        if (tenantData?.role) {
          setRoles([tenantData.role]);
        }
      }
      setTenants(tenantList);
      setStoredAccessToken(token);
      lastRefreshTimeRef.current = Date.now();

      // Trigger sync of permissions
      void syncEffectivePermissions(token);
    },
    [syncEffectivePermissions]
  );

  // Register callbacks with the 401 Auto-refresh Fetch Interceptor
  useEffect(() => {
    registerAuthCallbacks({
      onTokenRefreshed: (token, res) => {
        applyAuthData(token, res.user, res.activeTenant, res.tenants);
      },
      onSessionExpired: () => {
        clearAuthData();
      },
    });
  }, [applyAuthData, clearAuthData]);

  // Refresh session from server (via single-flight mutex / HttpOnly refresh token cookie)
  const refreshSession = useCallback(async () => {
    try {
      await requestNewAccessToken();
    } catch {
      // If refresh fails, try restoring with stored token or clear
      try {
        const storedToken = getStoredAccessToken();
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
              isSuperAdmin: profile.isSuperAdmin ?? false,
            },
            profile.activeTenant,
            profile.tenants
          );
          await syncEffectivePermissions(storedToken);
          return;
        }
      } catch {
        // Ignore
      }
      clearAuthData();
    }
  }, [applyAuthData, clearAuthData, syncEffectivePermissions]);

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

  // 1. Silent Background Refresh: Tự động làm mới token ngầm định kỳ mỗi 10 phút (Access Token sống 15m)
  useEffect(() => {
    if (!accessToken && !user) return;

    const SILENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 phút

    const intervalId = setInterval(async () => {
      try {
        await refreshSession();
      } catch {
        // Lỗi làm mới ngầm được xử lý bên trong refreshSession
      }
    }, SILENT_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [accessToken, user, refreshSession]);

  // 2. Lắng nghe sự kiện người dùng quay lại tab (visibilitychange) hoặc focus cửa sổ sau khi treo máy
  useEffect(() => {
    if (!accessToken && !user) return;

    const handleVisibilityOrFocus = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        const elapsedSinceLastRefresh =
          lastRefreshTimeRef.current > 0 ? Date.now() - lastRefreshTimeRef.current : 0;
        // Nếu đã hơn 9 phút trôi qua kể từ lần refresh trước, tự động làm mới ngầm ngay
        if (elapsedSinceLastRefresh >= 9 * 60 * 1000) {
          try {
            await refreshSession();
          } catch {
            // Xử lý bên trong refreshSession
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [accessToken, user, refreshSession]);

  // Login action
  const login = async (credentials: LoginCredentials) => {
    const res = await loginApi(credentials);
    applyAuthData(res.accessToken, res.user, res.activeTenant, res.tenants);
    await syncEffectivePermissions(res.accessToken);
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
    setStoredAccessToken(res.accessToken);
    lastRefreshTimeRef.current = Date.now();

    // Fetch updated tenant list & effective permissions in parallel
    try {
      const [updatedTenants, eff] = await Promise.all([
        getTenantsApi(res.accessToken).catch(async () => {
          const profile = await getProfileApi(res.accessToken);
          return profile.tenants;
        }),
        getEffectivePermissionsApi(res.accessToken).catch(() => null),
      ]);

      setTenants(updatedTenants);
      if (eff) {
        setPermissions(eff.permissions);
        setRoles(eff.roles);
        setIsSuperAdmin(eff.isSuperAdmin);
        setIsOwner(eff.isOwner);
        setIsAdmin(eff.isAdmin);
      } else if (res.activeTenant) {
        setIsOwner(res.activeTenant.role === "OWNER");
        setIsAdmin(res.activeTenant.role === "OWNER" || res.activeTenant.role === "ADMIN");
        setRoles([res.activeTenant.role]);
      }
    } catch {
      // Fallback
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
      isSuperAdmin: Boolean(profile.isSuperAdmin),
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

  // Delete organization action
  const deleteOrganization = async (tenantId: string) => {
    if (!accessToken) throw new Error("Chưa đăng nhập");
    const res = await deleteOrganizationApi(tenantId, accessToken);
    
    // Cập nhật danh sách tenants cục bộ
    const remainingTenants = tenants.filter((t) => t.id !== tenantId);
    setTenants(remainingTenants);

    // Nếu tenant bị xóa chính là activeTenant đang mở
    if (activeTenant?.id === tenantId) {
      if (remainingTenants.length > 0) {
        const nextTenant = remainingTenants.find((t) => t.isDefault) || remainingTenants[0];
        try {
          await switchTenant(nextTenant.id);
        } catch {
          setActiveTenant(null);
        }
      } else {
        setActiveTenant(null);
      }
    }

    return res;
  };

  // Leave organization action (self-service, non-owner, non-default tenant)
  const leaveOrganization = async (tenantId: string) => {
    if (!accessToken) throw new Error("Chưa đăng nhập");

    const remainingTenants = tenants.filter((t) => t.id !== tenantId);
    const leavingActive = activeTenant?.id === tenantId;
    const nextTenant = remainingTenants.find((t) => t.isDefault) || remainingTenants[0];

    // Switch away first: the leave call revokes sessions bound to this tenant,
    // so the current refresh token would become unusable afterwards.
    if (leavingActive && nextTenant) {
      await switchTenant(nextTenant.id);
    }

    const tokenForLeave = leavingActive ? getStoredAccessToken() || accessToken : accessToken;
    const res = await leaveOrganizationApi(tenantId, tokenForLeave);
    setTenants((prev) => prev.filter((t) => t.id !== tenantId));

    return res;
  };

  // Accept invitation: the returned session is bound to the joined tenant, so make it active immediately
  const acceptInvitation = async (token: string, dto: AcceptInvitationFormValues) => {
    const res = await acceptPublicInvitationApi(token, dto);
    const tenantList = await getTenantsApi(res.accessToken)
      .catch(async () => (await getProfileApi(res.accessToken)).tenants)
      .catch(() => [] as TenantListItem[]);

    applyAuthData(res.accessToken, res.user, res.activeTenant, tenantList);
    return { activeTenant: res.activeTenant, message: res.message };
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

  // Change password action
  const changePassword = async (data: ChangePasswordData) => {
    if (!accessToken) throw new Error("Chưa đăng nhập");
    return changePasswordApi(data, accessToken);
  };

  // Update current user state optimistically
  const updateCurrentUser = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeTenant,
        tenants,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        permissions,
        roles,
        isSuperAdmin,
        isOwner,
        isAdmin,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        login,
        register,
        forgotPassword,
        resetPassword,
        logout,
        switchTenant,
        createOrganization,
        updateOrganization,
        setDefaultTenant,
        deleteOrganization,
        leaveOrganization,
        acceptInvitation,
        updateProfile,
        changePassword,
        updateCurrentUser,
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
