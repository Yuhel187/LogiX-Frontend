"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface RoutePermissionRule {
  pattern: RegExp;
  permission?: string;
  anyPermissions?: string[];
  superAdminOnly?: boolean;
}

const ROUTE_PERMISSIONS: RoutePermissionRule[] = [
  { pattern: /\/organization\/[^/]+\/roles/, anyPermissions: ["iam:role:read", "iam:role:manage"] },
  { pattern: /\/organization\/[^/]+\/members/, anyPermissions: ["iam:member:read", "iam:member:invite"] },
  { pattern: /\/settings\/roles/, anyPermissions: ["iam:role:read", "iam:role:manage"] },
  { pattern: /\/inventory/, anyPermissions: ["inventory:stock:read", "inventory:stock:adjust", "inventory:warehouse:read"] },
  { pattern: /\/orders/, anyPermissions: ["order:sales-order:read", "order:sales-order:create"] },
  { pattern: /\/transport/, anyPermissions: ["transport:trip:read", "transport:trip:create"] },
];

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission, isSuperAdmin } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-xs text-muted-foreground">{t("nav.loadingWorkspace")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Kiểm tra quyền truy cập route tương ứng
  const matchedRule = ROUTE_PERMISSIONS.find((rule) => rule.pattern.test(pathname));
  if (matchedRule) {
    let isBlocked = false;
    if (matchedRule.superAdminOnly && !isSuperAdmin) {
      isBlocked = true;
    } else if (matchedRule.permission && !hasPermission(matchedRule.permission)) {
      isBlocked = true;
    } else if (
      matchedRule.anyPermissions &&
      matchedRule.anyPermissions.length > 0 &&
      !hasAnyPermission(matchedRule.anyPermissions)
    ) {
      isBlocked = true;
    }

    if (isBlocked) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/60 p-8 shadow-sm backdrop-blur-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-8 ring-destructive/5 mb-6">
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
  }

  return <>{children}</>;
}

