"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

export function TransportContextGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { activeTenant, user, tenantTransition } = useAuth();
  const { t } = useTranslation();

  if (tenantTransition !== "idle") {
    return (
      <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {t("transport.context.transitioning")}
      </div>
    );
  }

  if (!activeTenant || !user) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
        {t("transport.context.unavailable")}
      </div>
    );
  }

  return (
    <div key={`${activeTenant.id}:${user.id}`} className="min-w-0">
      {children}
    </div>
  );
}
