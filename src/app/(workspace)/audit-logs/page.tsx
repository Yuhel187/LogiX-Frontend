"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { AUDIT_PERMISSIONS } from "@/features/audit";
import { AuditExplorerScreen } from "@/features/audit/client";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const { isLoading, isSuperAdmin, hasPermission } = useAuth();

  if (isLoading) {
    return null;
  }

  const canRead = isSuperAdmin || hasPermission(AUDIT_PERMISSIONS.LOG_READ);

  if (!canRead) {
    return (
      <div className="mx-auto max-w-xl p-6 md:p-10">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            {t("audit.accessDeniedTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("audit.accessDeniedDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <React.Suspense fallback={null}>
      <AuditExplorerScreen />
    </React.Suspense>
  );
}
