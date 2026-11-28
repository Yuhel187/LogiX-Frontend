"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { NOTIFICATION_BROADCAST_PERMISSIONS } from "@/features/notifications";
import { BroadcastCenterScreen } from "@/features/notifications/client";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

export default function BroadcastsPage() {
  const { t } = useTranslation();
  const { isLoading, isSuperAdmin, hasAnyPermission } = useAuth();

  if (isLoading) {
    return null;
  }

  const canAccess =
    isSuperAdmin ||
    hasAnyPermission([
      NOTIFICATION_BROADCAST_PERMISSIONS.READ,
      NOTIFICATION_BROADCAST_PERMISSIONS.SEND,
    ]);

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-xl p-6 md:p-10">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            {t("notifications.broadcast.accessDeniedTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("notifications.broadcast.accessDeniedDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <React.Suspense fallback={null}>
      <BroadcastCenterScreen />
    </React.Suspense>
  );
}
