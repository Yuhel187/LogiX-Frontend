"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  BROADCAST_STATUSES,
  type BroadcastStatus,
} from "../constants/notification-permissions";
import type { BroadcastAudience } from "../schemas/broadcast.schema";
import {
  NOTIFICATION_SEVERITIES,
  type NotificationSeverity,
} from "../schemas/notification.schema";

const STATUS_BADGE_MAP: Record<
  BroadcastStatus,
  {
    className: string;
    Icon: React.ComponentType<{ className?: string }>;
    spin?: boolean;
  }
> = {
  [BROADCAST_STATUSES.QUEUED]: {
    className:
      "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    Icon: Clock,
  },
  [BROADCAST_STATUSES.FANOUTING]: {
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    Icon: Loader2,
    spin: true,
  },
  [BROADCAST_STATUSES.READY]: {
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    Icon: Loader2,
    spin: true,
  },
  [BROADCAST_STATUSES.COMPLETED]: {
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  [BROADCAST_STATUSES.PARTIAL_FAILED]: {
    className:
      "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    Icon: AlertTriangle,
  },
  [BROADCAST_STATUSES.FAILED]: {
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    Icon: XCircle,
  },
};

const SEVERITY_BADGE_MAP: Record<
  NotificationSeverity,
  {
    className: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  [NOTIFICATION_SEVERITIES.INFO]: {
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    Icon: Info,
  },
  [NOTIFICATION_SEVERITIES.WARNING]: {
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  [NOTIFICATION_SEVERITIES.CRITICAL]: {
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    Icon: ShieldAlert,
  },
};

export function BroadcastStatusBadge({
  status,
  className,
}: {
  status: BroadcastStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  const config = STATUS_BADGE_MAP[status] ?? STATUS_BADGE_MAP.QUEUED;
  const { Icon } = config;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
        config.className,
        className,
      )}
    >
      <Icon
        className={cn("size-3", config.spin && "animate-spin")}
        aria-hidden="true"
      />
      <span>{t(`notifications.broadcast.statuses.${status}`)}</span>
    </Badge>
  );
}

export function BroadcastSeverityBadge({
  severity,
  className,
}: {
  severity: NotificationSeverity;
  className?: string;
}) {
  const { t } = useTranslation();
  const config = SEVERITY_BADGE_MAP[severity] ?? SEVERITY_BADGE_MAP.INFO;
  const { Icon } = config;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 font-medium whitespace-nowrap",
        config.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span>{t(`notifications.broadcast.severities.${severity}`)}</span>
    </Badge>
  );
}

export function formatBroadcastAudienceSummary(
  audience: BroadcastAudience,
  t: (path: string, params?: Record<string, string | number>) => string,
  roleNameMap?: ReadonlyMap<string, string>,
): string {
  if (audience.kind === "ALL") {
    return t("notifications.broadcast.audience.allMembers");
  }
  if (audience.kind === "ROLES") {
    if (roleNameMap && audience.roleIds.length <= 2) {
      const names = audience.roleIds
        .map((id) => roleNameMap.get(id))
        .filter((name): name is string => Boolean(name));
      if (names.length === audience.roleIds.length && names.length > 0) {
        return names.join(", ");
      }
    }
    return t("notifications.broadcast.audience.rolesCount", {
      count: audience.roleIds.length,
    });
  }
  return t("notifications.broadcast.audience.usersCount", {
    count: audience.userIds.length,
  });
}

export function BroadcastAudiencePill({
  audience,
  roleNameMap,
}: {
  audience: BroadcastAudience;
  roleNameMap?: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Users className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {formatBroadcastAudienceSummary(audience, t, roleNameMap)}
      </span>
    </span>
  );
}
