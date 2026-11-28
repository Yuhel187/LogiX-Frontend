"use client";

import * as React from "react";
import { Bot, CheckCircle2, Cpu, ShieldX, User, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AuditOutcomeBadge({
  outcome,
  className,
}: {
  outcome: string;
  className?: string;
}) {
  const { t } = useTranslation();

  if (outcome === "SUCCESS") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium",
          className,
        )}
      >
        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{t("audit.outcomes.SUCCESS")}</span>
      </Badge>
    );
  }

  if (outcome === "DENIED") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium",
          className,
        )}
      >
        <ShieldX className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{t("audit.outcomes.DENIED")}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-destructive/30 bg-destructive/10 text-destructive font-medium",
        className,
      )}
    >
      <XCircle className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{t("audit.outcomes.FAILED")}</span>
    </Badge>
  );
}

export function AuditActorTypeBadge({
  actorType,
  className,
}: {
  actorType: string;
  className?: string;
}) {
  const { t } = useTranslation();

  if (actorType === "AGENT") {
    return (
      <Badge
        variant="secondary"
        className={cn("gap-1 font-medium text-foreground", className)}
      >
        <Bot className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{t("audit.actorTypes.AGENT")}</span>
      </Badge>
    );
  }

  if (actorType === "SYSTEM") {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1 font-medium text-muted-foreground", className)}
      >
        <Cpu className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{t("audit.actorTypes.SYSTEM")}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium text-foreground", className)}
    >
      <User className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{t("audit.actorTypes.USER")}</span>
    </Badge>
  );
}
