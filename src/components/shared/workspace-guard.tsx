"use client";

import React, { useEffect } from "react";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SHIPMENT_PERMISSIONS } from "@/features/shipments";
import {
  canAccessDriverExperience,
  isDriverTripRoute,
  requiredTransportRoutePermission,
} from "@/features/transport";

interface RoutePermissionRule {
  pattern: RegExp;
  permission?: string;
  anyPermissions?: string[];
  superAdminOnly?: boolean;
}

const ROUTE_PERMISSIONS: RoutePermissionRule[] = [
  { pattern: /^\/admin(?:\/|$)/, superAdminOnly: true },
  { pattern: /^\/shipments(?:\/|$)/, permission: SHIPMENT_PERMISSIONS.read },
  {
    pattern: /\/organization\/[^/]+\/roles/,
    anyPermissions: ["iam:role:read", "iam:role:manage"],
  },
  {
    pattern: /\/organization\/[^/]+\/members/,
    anyPermissions: ["iam:member:read", "iam:member:invite"],
  },
  {
    pattern: /\/settings\/roles/,
    anyPermissions: ["iam:role:read", "iam:role:manage"],
  },
  {
    pattern: /\/inventory/,
    anyPermissions: [
      "inventory:stock:read",
      "inventory:stock:adjust",
      "inventory:warehouse:read",
    ],
  },
  {
    pattern: /\/orders/,
    anyPermissions: ["order:sales-order:read", "order:sales-order:create"],
  },
];

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    hasPermission,
    hasAnyPermission,
    isSuperAdmin,
    permissions,
    tenantTransition,
    recoverTenantContext,
  } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const transportPermission = requiredTransportRoutePermission(pathname);
  const driverRoute = isDriverTripRoute(pathname);

  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated &&
      tenantTransition !== "unknown" &&
      tenantTransition !== "switching"
    ) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router, tenantTransition]);

  if (tenantTransition === "switching") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground"
        role="status"
      >
        <Loader2
          aria-hidden="true"
          className="size-8 animate-spin text-primary"
        />
        <p className="text-sm text-muted-foreground">
          {t("admin.inject.switching")}
        </p>
      </div>
    );
  }

  if (tenantTransition === "unknown") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"
        role="status"
      >
        <p>{t("admin.inject.unknown")}</p>
        <Button
          onClick={async () => {
            try {
              await recoverTenantContext();
            } catch {
              toast.error(t("admin.inject.recoveryError"));
            }
          }}
        >
          {t("admin.inject.verify")}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.replace("/login")}
        >
          {t("admin.actions.login")}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-xs text-muted-foreground">
            {t("nav.loadingWorkspace")}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Kiểm tra quyền truy cập route tương ứng
  const matchedRule = ROUTE_PERMISSIONS.find((rule) =>
    rule.pattern.test(pathname),
  );
  let isBlocked = false;
  if (matchedRule) {
    if (matchedRule.superAdminOnly && !isSuperAdmin) {
      isBlocked = true;
    } else if (
      matchedRule.permission &&
      !hasPermission(matchedRule.permission)
    ) {
      isBlocked = true;
    } else if (
      matchedRule.anyPermissions &&
      matchedRule.anyPermissions.length > 0 &&
      !hasAnyPermission(matchedRule.anyPermissions)
    ) {
      isBlocked = true;
    }
  }
  if (transportPermission && !hasPermission(transportPermission)) {
    isBlocked = true;
  }
  if (driverRoute && !canAccessDriverExperience(permissions, isSuperAdmin)) {
    isBlocked = true;
  }
  if (isBlocked) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/60 p-8 shadow-sm backdrop-blur-md">
          <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-8 ring-destructive/5">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl mb-2">
            {t("accessDenied.title")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {t("accessDenied.description")}
          </p>
          <Button
            onClick={() => router.push("/")}
            variant="default"
            className="h-9 gap-2 px-4 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("accessDenied.backHome")}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
