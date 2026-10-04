"use client";

import React from "react";
import { useAuth } from "@/lib/auth";

export interface PermissionGuardProps {
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  requireSuperAdmin?: boolean;
  requireOwner?: boolean;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component kiểm soát hiển thị giao diện theo quyền động (Conditional UI Gatekeeper).
 * Hỗ trợ kiểm tra quyền đơn, đa quyền (ANY / ALL), hoặc vai trò đặc biệt (SuperAdmin, Owner, Admin).
 */
export function PermissionGuard({
  permission,
  anyPermissions,
  allPermissions,
  requireSuperAdmin,
  requireOwner,
  requireAdmin,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    isOwner,
    isAdmin,
  } = useAuth();

  // 1. Kiểm tra yêu cầu vai trò tối cao
  if (requireSuperAdmin && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  if (requireOwner && !isOwner && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  if (requireAdmin && !isAdmin && !isOwner && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  // 2. Kiểm tra quyền cụ thể
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (anyPermissions && anyPermissions.length > 0 && !hasAnyPermission(anyPermissions)) {
    return <>{fallback}</>;
  }

  if (allPermissions && allPermissions.length > 0 && !hasAllPermissions(allPermissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
