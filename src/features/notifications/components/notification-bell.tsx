"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Loader2,
  Megaphone,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { BROADCASTS_ROUTE } from "@/lib/config/routes";
import { useTranslation } from "@/lib/i18n";
import { NOTIFICATION_BROADCAST_PERMISSIONS } from "../constants/notification-permissions";
import {
  getSafeNotificationLink,
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_TYPES,
  type NotificationItem,
} from "../schemas/notification.schema";
import { useNotifications } from "./notification-provider";

function getNotificationVisual(item: NotificationItem): {
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
} {
  switch (item.type) {
    case NOTIFICATION_TYPES.ORDER_PENDING_STOCK:
      return {
        Icon: Package,
        colorClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
      };
    case NOTIFICATION_TYPES.TRIP_DISPATCHED:
      return {
        Icon: Truck,
        colorClass: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
      };
    case NOTIFICATION_TYPES.DELIVERY_FAILED:
      return {
        Icon: AlertTriangle,
        colorClass: "text-destructive bg-destructive/10",
      };
    case NOTIFICATION_TYPES.DELIVERY_COMPLETED:
      return {
        Icon: CheckCircle2,
        colorClass:
          "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      };
    case NOTIFICATION_TYPES.ADMIN_BROADCAST:
      return {
        Icon: Megaphone,
        colorClass: "text-primary bg-primary/10",
      };
    default:
      if (item.severity === NOTIFICATION_SEVERITIES.CRITICAL) {
        return {
          Icon: AlertTriangle,
          colorClass: "text-destructive bg-destructive/10",
        };
      }
      if (item.severity === NOTIFICATION_SEVERITIES.WARNING) {
        return {
          Icon: AlertTriangle,
          colorClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
        };
      }
      return {
        Icon: Info,
        colorClass: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
      };
  }
}

function formatRelativeTime(createdAt: string, locale: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: locale === "en" ? enUS : vi,
  });
}

export function NotificationBell() {
  const { t, locale } = useTranslation();
  const { isSuperAdmin, hasAnyPermission } = useAuth();
  const router = useRouter();
  const {
    items,
    unreadCount,
    isLoading,
    isConnected,
    error,
    refresh,
    markRead,
    markAllRead,
    archive,
  } = useNotifications();
  const [open, setOpen] = React.useState(false);

  const canAccessBroadcastCenter =
    isSuperAdmin ||
    hasAnyPermission([
      NOTIFICATION_BROADCAST_PERMISSIONS.READ,
      NOTIFICATION_BROADCAST_PERMISSIONS.SEND,
    ]);

  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  const handleItemClick = (item: NotificationItem) => {
    if (item.readAt === null) {
      void markRead(item.id);
    }
    const safeLink = getSafeNotificationLink(item.link);
    setOpen(false);
    if (safeLink) {
      router.push(safeLink);
    }
  };

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label={t("notifications.title")}
          title={
            isConnected
              ? `${t("notifications.title")} — ${t("notifications.realtimeConnected")}`
              : `${t("notifications.title")} — ${t("notifications.realtimeReconnecting")}`
          }
        >
          <div className="relative flex items-center justify-center">
            <Bell className="size-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1.5 -right-2 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-xs ring-2 ring-background">
                {badgeText}
              </span>
            ) : (
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-background",
                  isConnected ? "bg-emerald-500" : "bg-amber-500/80",
                )}
              />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 max-w-[calc(100vw-1.5rem)] p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {t("notifications.title")}
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {t("header.newBadge", { count: unreadCount })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void markAllRead()}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                <span>{t("notifications.markAllRead")}</span>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={t("notifications.refresh")}
              title={t("notifications.refresh")}
            >
              <RefreshCw
                className={cn("size-3.5", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-96 overflow-y-auto divide-y divide-border/40">
          {isLoading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-xs">{t("notifications.loading")}</span>
            </div>
          ) : error && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <AlertTriangle className="size-5 text-destructive" />
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refresh()}
                className="h-7 text-xs"
              >
                {t("notifications.retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-10 text-center">
              <Bell className="size-6 text-muted-foreground/50" />
              <p className="text-xs font-medium text-foreground">
                {t("notifications.empty")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("notifications.emptyDesc")}
              </p>
            </div>
          ) : (
            items.map((item) => {
              const { Icon, colorClass } = getNotificationVisual(item);
              const isUnread = item.readAt === null;
              const timeLabel = formatRelativeTime(item.createdAt, locale);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleItemClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleItemClick(item);
                    }
                  }}
                  className={cn(
                    "group flex items-start gap-3 p-3 transition-colors hover:bg-muted/50 cursor-pointer",
                    isUnread && "bg-primary/5",
                  )}
                >
                  <div className={cn("mt-0.5 rounded-md p-1.5 shrink-0", colorClass)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs leading-snug line-clamp-1",
                          isUnread
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/85",
                        )}
                      >
                        {item.title}
                      </p>
                      {isUnread && (
                        <span
                          aria-hidden="true"
                          className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {item.body}
                    </p>
                    {timeLabel && (
                      <span className="block text-[10px] text-muted-foreground/80 font-medium">
                        {timeLabel}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      void archive(item.id);
                    }}
                    className="size-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer"
                    aria-label={t("notifications.archive")}
                    title={t("notifications.archive")}
                  >
                    <Archive className="size-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                isConnected ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            {isConnected
              ? t("notifications.realtimeConnected")
              : t("notifications.realtimeReconnecting")}
          </span>
          {canAccessBroadcastCenter && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] font-medium text-primary hover:text-primary"
            >
              <Link href={BROADCASTS_ROUTE} onClick={() => setOpen(false)}>
                <Megaphone className="size-3 mr-1" aria-hidden="true" />
                <span>{t("notifications.broadcast.openCenter")}</span>
              </Link>
            </Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
