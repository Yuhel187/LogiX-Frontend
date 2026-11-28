"use client";

import * as React from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  RefreshCw,
} from "lucide-react";
import type { OrgMember, RoleItem } from "@/features/identity";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useBoundedRefresh } from "@/lib/api/use-bounded-refresh";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getBroadcastByIdApi } from "../api/broadcasts.api";
import {
  isBroadcastInProgress,
  type BroadcastHistoryItem,
} from "../schemas/broadcast.schema";
import {
  BroadcastSeverityBadge,
  BroadcastStatusBadge,
  formatBroadcastAudienceSummary,
} from "./broadcast-badges";

interface BroadcastDetailSheetProps {
  broadcastId: string | null;
  initialItem: BroadcastHistoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleItem[];
  members: OrgMember[];
  onItemUpdated?: (item: BroadcastHistoryItem) => void;
}

function formatDateTime(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function computePercentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

export function BroadcastDetailSheet({
  broadcastId,
  initialItem,
  open,
  onOpenChange,
  roles,
  members,
  onItemUpdated,
}: BroadcastDetailSheetProps) {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [reloadTick, setReloadTick] = React.useState(0);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [techOpen, setTechOpen] = React.useState(false);

  const [detailState, setDetailState] = React.useState<{
    resolvedKey: string;
    item: BroadcastHistoryItem | null;
    error: string | null;
  }>({
    resolvedKey: "",
    item: null,
    error: null,
  });

  const requestKey =
    open && broadcastId ? `${broadcastId}#${reloadTick}` : "";

  const isLoading =
    Boolean(requestKey) && detailState.resolvedKey !== requestKey;
  const currentItem =
    detailState.item && detailState.item.id === broadcastId
      ? detailState.item
      : initialItem;
  const error =
    Boolean(requestKey) && detailState.resolvedKey === requestKey
      ? detailState.error
      : null;

  React.useEffect(() => {
    if (!requestKey || !broadcastId) return;

    const controller = new AbortController();

    getBroadcastByIdApi(broadcastId, controller.signal)
      .then((item) => {
        if (controller.signal.aborted) return;
        setDetailState({
          resolvedKey: requestKey,
          item,
          error: null,
        });
        onItemUpdated?.(item);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setDetailState((prev) => ({
          resolvedKey: requestKey,
          item: prev.item && prev.item.id === broadcastId ? prev.item : null,
          error: t("notifications.broadcast.detail.loadError"),
        }));
      });

    return () => controller.abort();
  }, [broadcastId, onItemUpdated, requestKey, t]);

  const triggerRefresh = React.useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  const shouldPoll =
    open &&
    Boolean(broadcastId) &&
    Boolean(currentItem && isBroadcastInProgress(currentItem.status));

  useBoundedRefresh(
    `broadcast-detail:${broadcastId ?? "none"}`,
    triggerRefresh,
    shouldPoll,
  );

  const roleNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const role of roles) {
      map.set(role.id, role.name);
    }
    return map;
  }, [roles]);

  const memberByUserId = React.useMemo(() => {
    const map = new Map<string, OrgMember>();
    for (const member of members) {
      map.set(member.userId, member);
    }
    return map;
  }, [members]);

  const senderLabel = React.useMemo(() => {
    if (!currentItem) return "";
    if (user && currentItem.senderId === user.id) {
      return `${user.displayName} (${t("notifications.broadcast.table.youSender")})`;
    }
    const member = memberByUserId.get(currentItem.senderId);
    if (member) {
      return member.email
        ? `${member.displayName} (${member.email})`
        : member.displayName;
    }
    return t("notifications.broadcast.table.unknownSender");
  }, [currentItem, memberByUserId, t, user]);

  const handleCopy = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Clipboard unavailable in restricted contexts
    }
  };

  const deliveredPct = currentItem
    ? computePercentage(currentItem.deliveredCount, currentItem.recipientCount)
    : 0;
  const readPct = currentItem
    ? computePercentage(currentItem.readCount, currentItem.recipientCount)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle>{t("notifications.broadcast.detail.title")}</SheetTitle>
          <SheetDescription>
            {t("notifications.broadcast.detail.description")}
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center justify-between gap-2 text-xs">
                <span>{error}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={triggerRefresh}
                  className="h-7 shrink-0"
                >
                  {t("notifications.broadcast.table.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {currentItem && (
            <>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <BroadcastSeverityBadge severity={currentItem.severity} />
                    <BroadcastStatusBadge status={currentItem.status} />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={triggerRefresh}
                    disabled={isLoading}
                    className="h-8 text-xs"
                  >
                    <RefreshCw
                      className={cn(
                        "size-3.5 mr-1.5",
                        isLoading && "animate-spin",
                      )}
                    />
                    {t("notifications.broadcast.detail.refreshStatus")}
                  </Button>
                </div>

                <h3 className="text-base font-semibold text-foreground leading-snug">
                  {currentItem.title}
                </h3>

                <p className="text-xs text-muted-foreground">
                  {t(
                    `notifications.broadcast.statusDescriptions.${currentItem.status}`,
                  )}
                </p>
              </div>

              {currentItem.lastError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle className="text-xs">
                    {t("notifications.broadcast.detail.errorTitle")}
                  </AlertTitle>
                  <AlertDescription className="text-xs break-words">
                    {currentItem.lastError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[11px] text-muted-foreground">
                    {t("notifications.broadcast.detail.recipients")}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {currentItem.recipientCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[11px] text-muted-foreground">
                    {t("notifications.broadcast.detail.delivered")}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {currentItem.deliveredCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[11px] text-muted-foreground">
                    {t("notifications.broadcast.detail.read")}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {currentItem.readCount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {t("notifications.broadcast.detail.deliveryProgress")}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {currentItem.deliveredCount}/{currentItem.recipientCount}{" "}
                      ({deliveredPct}%)
                    </span>
                  </div>
                  <Progress value={deliveredPct} className="h-2" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {t("notifications.broadcast.detail.readProgress")}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {currentItem.readCount}/{currentItem.recipientCount} (
                      {readPct}%)
                    </span>
                  </div>
                  <Progress value={readPct} className="h-2" />
                </div>
              </div>

              {/* Metadata */}
              <dl className="space-y-3 rounded-lg border border-border bg-card p-4 text-xs">
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">
                    {t("notifications.broadcast.detail.audience")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    <p>
                      {formatBroadcastAudienceSummary(
                        currentItem.audience,
                        t,
                        roleNameMap,
                      )}
                    </p>
                    {currentItem.audience.kind === "ROLES" && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {currentItem.audience.roleIds.map((roleId) => (
                          <Badge
                            key={roleId}
                            variant="secondary"
                            className="text-[11px]"
                          >
                            {roleNameMap.get(roleId) ?? roleId.slice(0, 8)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {currentItem.audience.kind === "USERS" && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {currentItem.audience.userIds.slice(0, 12).map((userId) => {
                          const m = memberByUserId.get(userId);
                          return (
                            <Badge
                              key={userId}
                              variant="secondary"
                              className="text-[11px]"
                            >
                              {m ? m.displayName : userId.slice(0, 8)}
                            </Badge>
                          );
                        })}
                        {currentItem.audience.userIds.length > 12 && (
                          <Badge variant="outline" className="text-[11px]">
                            +{currentItem.audience.userIds.length - 12}
                          </Badge>
                        )}
                      </div>
                    )}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                  <dt className="text-muted-foreground">
                    {t("notifications.broadcast.detail.sender")}
                  </dt>
                  <dd className="font-medium text-foreground text-right">
                    {senderLabel}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                  <dt className="text-muted-foreground">
                    {t("notifications.broadcast.detail.createdAt")}
                  </dt>
                  <dd className="font-medium text-foreground text-right tabular-nums">
                    {formatDateTime(currentItem.createdAt, locale)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                  <dt className="text-muted-foreground">
                    {t("notifications.broadcast.detail.completedAt")}
                  </dt>
                  <dd className="font-medium text-foreground text-right tabular-nums">
                    {formatDateTime(currentItem.completedAt, locale) ??
                      t("notifications.broadcast.detail.notCompletedYet")}
                  </dd>
                </div>
              </dl>

              {/* Expandable Reference Details */}
              <Collapsible open={techOpen} onOpenChange={setTechOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span>
                      {t("notifications.broadcast.detail.referenceDetails")}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        techOpen && "rotate-180",
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {t("notifications.broadcast.detail.broadcastId")}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy("id", currentItem.id)}
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-foreground hover:text-primary cursor-pointer"
                      title={t("notifications.broadcast.detail.copyId")}
                    >
                      <span>{currentItem.id}</span>
                      {copiedField === "id" ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {t("notifications.broadcast.detail.senderId")}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopy("senderId", currentItem.senderId)
                      }
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-foreground hover:text-primary cursor-pointer"
                      title={t("notifications.broadcast.detail.copyId")}
                    >
                      <span>{currentItem.senderId}</span>
                      {copiedField === "senderId" ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
