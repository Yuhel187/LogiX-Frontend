"use client";

import * as React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  getOrganizationMembersApi,
  getRolesApi,
  type OrgMember,
  type RoleItem,
} from "@/features/identity";
import { PageHeader } from "@/components/shared/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isApiError } from "@/lib/api";
import { useBoundedRefresh } from "@/lib/api/use-bounded-refresh";
import { useAuth } from "@/lib/auth";
import { WORKSPACE_HOME_ROUTE } from "@/lib/config/routes";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { listBroadcastsApi } from "../api/broadcasts.api";
import {
  BROADCAST_LIMITS,
  NOTIFICATION_BROADCAST_PERMISSIONS,
} from "../constants/notification-permissions";
import {
  isBroadcastInProgress,
  type BroadcastHistoryItem,
  type CreateBroadcastResponse,
} from "../schemas/broadcast.schema";
import {
  BroadcastAudiencePill,
  BroadcastSeverityBadge,
  BroadcastStatusBadge,
} from "./broadcast-badges";
import { BroadcastDetailSheet } from "./broadcast-detail-sheet";
import {
  CreateBroadcastDialog,
  type DirectoryLookupState,
} from "./create-broadcast-dialog";

function formatShortDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function BroadcastCenterScreen() {
  const { t, locale } = useTranslation();
  const { activeTenant, user, isSuperAdmin, hasPermission } = useAuth();

  const canRead =
    isSuperAdmin || hasPermission(NOTIFICATION_BROADCAST_PERMISSIONS.READ);
  const canSend =
    isSuperAdmin || hasPermission(NOTIFICATION_BROADCAST_PERMISSIONS.SEND);

  const tenantId = activeTenant?.id ?? "";
  const historyScopeKey = canRead && tenantId ? tenantId : "";
  const directoryScopeKey = canRead || canSend ? tenantId : "";

  const [historyState, setHistoryState] = React.useState<{
    scopeKey: string;
    hasLoadedInitial: boolean;
    items: BroadcastHistoryItem[];
    nextCursor: string | null;
    isRefreshing: boolean;
    isLoadingMore: boolean;
    loadError: string | null;
  }>({
    scopeKey: "",
    hasLoadedInitial: false,
    items: [],
    nextCursor: null,
    isRefreshing: false,
    isLoadingMore: false,
    loadError: null,
  });

  const [composerOpen, setComposerOpen] = React.useState(false);
  const [selectionState, setSelectionState] = React.useState<{
    scopeKey: string;
    selectedId: string | null;
    detailOpen: boolean;
    lastSent: CreateBroadcastResponse | null;
  }>({
    scopeKey: "",
    selectedId: null,
    detailOpen: false,
    lastSent: null,
  });

  const [rolesState, setRolesState] = React.useState<{
    scopeKey: string;
    resolvedKey: string;
    items: RoleItem[];
    error: string | null;
    forbidden: boolean;
  }>({
    scopeKey: "",
    resolvedKey: "",
    items: [],
    error: null,
    forbidden: false,
  });
  const [rolesRetryTick, setRolesRetryTick] = React.useState(0);

  const [membersState, setMembersState] = React.useState<{
    scopeKey: string;
    resolvedKey: string;
    items: OrgMember[];
    error: string | null;
    forbidden: boolean;
  }>({
    scopeKey: "",
    resolvedKey: "",
    items: [],
    error: null,
    forbidden: false,
  });
  const [membersRetryTick, setMembersRetryTick] = React.useState(0);

  const inFlightRefreshRef = React.useRef<AbortController | null>(null);

  const sameHistoryScope = historyState.scopeKey === historyScopeKey;
  const items = React.useMemo(
    () => (sameHistoryScope ? historyState.items : []),
    [historyState.items, sameHistoryScope],
  );
  const nextCursor = sameHistoryScope ? historyState.nextCursor : null;
  const hasLoadedInitial = sameHistoryScope
    ? historyState.hasLoadedInitial
    : false;
  const isRefreshing = sameHistoryScope ? historyState.isRefreshing : false;
  const isLoadingMore = sameHistoryScope ? historyState.isLoadingMore : false;
  const loadError = sameHistoryScope ? historyState.loadError : null;

  const sameSelectionScope = selectionState.scopeKey === tenantId;
  const selectedId = sameSelectionScope ? selectionState.selectedId : null;
  const detailOpen = sameSelectionScope ? selectionState.detailOpen : false;
  const lastSent = sameSelectionScope ? selectionState.lastSent : null;

  const rolesRequestKey = directoryScopeKey
    ? `${directoryScopeKey}#${rolesRetryTick}`
    : "";
  const roles = React.useMemo(
    () =>
      rolesState.scopeKey === directoryScopeKey ? rolesState.items : [],
    [directoryScopeKey, rolesState.items, rolesState.scopeKey],
  );
  const rolesLoading =
    Boolean(rolesRequestKey) && rolesState.resolvedKey !== rolesRequestKey;
  const rolesError =
    rolesState.resolvedKey === rolesRequestKey ? rolesState.error : null;
  const rolesForbidden =
    rolesState.resolvedKey === rolesRequestKey ? rolesState.forbidden : false;

  const membersRequestKey = directoryScopeKey
    ? `${directoryScopeKey}#${membersRetryTick}`
    : "";
  const members = React.useMemo(
    () =>
      membersState.scopeKey === directoryScopeKey ? membersState.items : [],
    [directoryScopeKey, membersState.items, membersState.scopeKey],
  );
  const membersLoading =
    Boolean(membersRequestKey) &&
    membersState.resolvedKey !== membersRequestKey;
  const membersError =
    membersState.resolvedKey === membersRequestKey ? membersState.error : null;
  const membersForbidden =
    membersState.resolvedKey === membersRequestKey
      ? membersState.forbidden
      : false;

  const fetchHistory = React.useCallback(
    async (options: { reset?: boolean } = {}) => {
      if (!historyScopeKey) return;

      inFlightRefreshRef.current?.abort();
      const controller = new AbortController();
      inFlightRefreshRef.current = controller;

      setHistoryState((prev) => ({
        scopeKey: historyScopeKey,
        hasLoadedInitial:
          prev.scopeKey === historyScopeKey ? prev.hasLoadedInitial : false,
        items: prev.scopeKey === historyScopeKey ? prev.items : [],
        nextCursor:
          prev.scopeKey === historyScopeKey ? prev.nextCursor : null,
        isRefreshing: true,
        isLoadingMore: false,
        loadError: null,
      }));

      try {
        const res = await listBroadcastsApi(
          { limit: BROADCAST_LIMITS.defaultPageSize },
          controller.signal,
        );
        if (controller.signal.aborted) return;

        setHistoryState((prev) => {
          const sameScope = prev.scopeKey === historyScopeKey;
          const prevItems = sameScope ? prev.items : [];
          let mergedItems = res.items;

          if (
            !options.reset &&
            sameScope &&
            prevItems.length > BROADCAST_LIMITS.defaultPageSize
          ) {
            const headIds = new Set(res.items.map((item) => item.id));
            const tail = prevItems.filter((item) => !headIds.has(item.id));
            mergedItems = [...res.items, ...tail];
          }

          return {
            scopeKey: historyScopeKey,
            hasLoadedInitial: true,
            items: mergedItems,
            nextCursor:
              options.reset || !sameScope || !prev.hasLoadedInitial
                ? res.nextCursor
                : prev.nextCursor,
            isRefreshing: false,
            isLoadingMore: false,
            loadError: null,
          };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          isApiError(err) && err.status === 403
            ? t("notifications.broadcast.errors.forbidden")
            : t("notifications.broadcast.table.loadError");

        setHistoryState((prev) => ({
          scopeKey: historyScopeKey,
          hasLoadedInitial: true,
          items: prev.scopeKey === historyScopeKey ? prev.items : [],
          nextCursor:
            prev.scopeKey === historyScopeKey ? prev.nextCursor : null,
          isRefreshing: false,
          isLoadingMore: false,
          loadError: message,
        }));
      }
    },
    [historyScopeKey, t],
  );

  // Initial load when tenant or read permission becomes active
  React.useEffect(() => {
    if (!historyScopeKey) return;

    const controller = new AbortController();
    inFlightRefreshRef.current?.abort();
    inFlightRefreshRef.current = controller;

    listBroadcastsApi(
      { limit: BROADCAST_LIMITS.defaultPageSize },
      controller.signal,
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setHistoryState({
          scopeKey: historyScopeKey,
          hasLoadedInitial: true,
          items: res.items,
          nextCursor: res.nextCursor,
          isRefreshing: false,
          isLoadingMore: false,
          loadError: null,
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          isApiError(err) && err.status === 403
            ? t("notifications.broadcast.errors.forbidden")
            : t("notifications.broadcast.table.loadError");
        setHistoryState({
          scopeKey: historyScopeKey,
          hasLoadedInitial: true,
          items: [],
          nextCursor: null,
          isRefreshing: false,
          isLoadingMore: false,
          loadError: message,
        });
      });

    return () => {
      controller.abort();
    };
  }, [historyScopeKey, t]);

  // Load tenant roles directory
  React.useEffect(() => {
    if (!directoryScopeKey || !rolesRequestKey) return;

    let active = true;
    getRolesApi(directoryScopeKey)
      .then((data) => {
        if (!active) return;
        setRolesState({
          scopeKey: directoryScopeKey,
          resolvedKey: rolesRequestKey,
          items: data,
          error: null,
          forbidden: false,
        });
      })
      .catch((err) => {
        if (!active) return;
        const forbidden = isApiError(err) && err.status === 403;
        setRolesState({
          scopeKey: directoryScopeKey,
          resolvedKey: rolesRequestKey,
          items: [],
          error: forbidden
            ? null
            : t("notifications.broadcast.composer.directoryError"),
          forbidden,
        });
      });

    return () => {
      active = false;
    };
  }, [directoryScopeKey, rolesRequestKey, t]);

  // Load tenant members directory
  React.useEffect(() => {
    if (!directoryScopeKey || !membersRequestKey) return;

    const controller = new AbortController();
    getOrganizationMembersApi(directoryScopeKey, undefined, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setMembersState({
          scopeKey: directoryScopeKey,
          resolvedKey: membersRequestKey,
          items: data,
          error: null,
          forbidden: false,
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const forbidden = isApiError(err) && err.status === 403;
        setMembersState({
          scopeKey: directoryScopeKey,
          resolvedKey: membersRequestKey,
          items: [],
          error: forbidden
            ? null
            : t("notifications.broadcast.composer.directoryError"),
          forbidden,
        });
      });

    return () => {
      controller.abort();
    };
  }, [directoryScopeKey, membersRequestKey, t]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore || !historyScopeKey) return;
    setHistoryState((prev) => ({
      ...prev,
      isLoadingMore: true,
      loadError: null,
    }));

    try {
      const res = await listBroadcastsApi({
        cursor: nextCursor,
        limit: BROADCAST_LIMITS.defaultPageSize,
      });
      setHistoryState((prev) => {
        if (prev.scopeKey !== historyScopeKey) return prev;
        const existingIds = new Set(prev.items.map((item) => item.id));
        const appended = res.items.filter((item) => !existingIds.has(item.id));
        return {
          ...prev,
          items: [...prev.items, ...appended],
          nextCursor: res.nextCursor,
          isLoadingMore: false,
        };
      });
    } catch {
      setHistoryState((prev) => ({
        ...prev,
        isLoadingMore: false,
        loadError: t("notifications.broadcast.table.loadError"),
      }));
    }
  };

  const hasInProgress = React.useMemo(
    () => items.some((item) => isBroadcastInProgress(item.status)),
    [items],
  );

  const pollHead = React.useCallback(() => {
    void fetchHistory({ reset: false });
  }, [fetchHistory]);

  useBoundedRefresh(
    `broadcast-list:${tenantId || "none"}`,
    pollHead,
    canRead && hasInProgress && !composerOpen && !detailOpen,
  );

  const handleCreated = React.useCallback(
    (result: CreateBroadcastResponse) => {
      setSelectionState((prev) => ({
        scopeKey: tenantId,
        selectedId: prev.scopeKey === tenantId ? prev.selectedId : null,
        detailOpen: prev.scopeKey === tenantId ? prev.detailOpen : false,
        lastSent: result,
      }));
      if (canRead) {
        void fetchHistory({ reset: true });
      }
    },
    [canRead, fetchHistory, tenantId],
  );

  const handleOpenDetail = React.useCallback(
    (id: string) => {
      setSelectionState((prev) => ({
        scopeKey: tenantId,
        selectedId: id,
        detailOpen: true,
        lastSent: prev.scopeKey === tenantId ? prev.lastSent : null,
      }));
    },
    [tenantId],
  );

  const handleDetailOpenChange = React.useCallback(
    (open: boolean) => {
      setSelectionState((prev) => ({
        scopeKey: tenantId,
        selectedId: prev.scopeKey === tenantId ? prev.selectedId : null,
        detailOpen: open,
        lastSent: prev.scopeKey === tenantId ? prev.lastSent : null,
      }));
    },
    [tenantId],
  );

  const handleDetailUpdated = React.useCallback(
    (updated: BroadcastHistoryItem) => {
      setHistoryState((prev) => {
        if (prev.scopeKey !== historyScopeKey) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        };
      });
    },
    [historyScopeKey],
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

  const resolveSenderName = React.useCallback(
    (senderId: string) => {
      if (user && senderId === user.id) {
        return t("notifications.broadcast.table.youSender");
      }
      const member = memberByUserId.get(senderId);
      if (member) return member.displayName;
      return t("notifications.broadcast.table.unknownSender");
    },
    [memberByUserId, t, user],
  );

  const stats = React.useMemo(() => {
    const inProgressCount = items.filter((item) =>
      isBroadcastInProgress(item.status),
    ).length;
    const totalRecipients = items.reduce(
      (sum, item) => sum + item.recipientCount,
      0,
    );
    const totalDelivered = items.reduce(
      (sum, item) => sum + item.deliveredCount,
      0,
    );
    const totalRead = items.reduce((sum, item) => sum + item.readCount, 0);
    const readRatePct =
      totalRecipients > 0 ? Math.round((totalRead / totalRecipients) * 100) : 0;

    return {
      totalShown: items.length,
      inProgressCount,
      totalRecipients,
      totalDelivered,
      totalRead,
      readRatePct,
    };
  }, [items]);

  const selectedItem = React.useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const rolesLookupState: DirectoryLookupState<RoleItem> = React.useMemo(
    () => ({
      items: roles,
      isLoading: rolesLoading,
      error: rolesError,
      forbidden: rolesForbidden,
      onRetry: () => setRolesRetryTick((tick) => tick + 1),
    }),
    [roles, rolesError, rolesForbidden, rolesLoading],
  );

  const membersLookupState: DirectoryLookupState<OrgMember> = React.useMemo(
    () => ({
      items: members,
      isLoading: membersLoading,
      error: membersError,
      forbidden: membersForbidden,
      onRetry: () => setMembersRetryTick((tick) => tick + 1),
    }),
    [members, membersError, membersForbidden, membersLoading],
  );

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: t("nav.overview"), href: WORKSPACE_HOME_ROUTE },
          { label: t("notifications.broadcast.navTitle") },
        ]}
        title={t("notifications.broadcast.pageTitle")}
        description={t("notifications.broadcast.pageDescription")}
        actions={
          <>
            {canRead && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchHistory({ reset: true })}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn(
                    "size-4 mr-2",
                    isRefreshing && "animate-spin",
                  )}
                />
                {t("notifications.broadcast.refresh")}
              </Button>
            )}
            {canSend && (
              <Button
                type="button"
                size="sm"
                onClick={() => setComposerOpen(true)}
              >
                <Plus className="size-4 mr-2" />
                {t("notifications.broadcast.createAction")}
              </Button>
            )}
          </>
        }
      />

      {canSend && !canRead ? (
        <div className="space-y-4">
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertTitle>
              {t("notifications.broadcast.sendOnlyNoticeTitle")}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {t("notifications.broadcast.sendOnlyNoticeDesc")}
            </AlertDescription>
          </Alert>

          {lastSent && (
            <Card className="border-border/80 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span>{t("notifications.broadcast.composer.lastSentTitle")}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("notifications.broadcast.composer.lastSentDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <BroadcastStatusBadge status={lastSent.status} />
                <span className="font-mono text-muted-foreground">
                  {lastSent.id}
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <>
          {/* Summary KPI Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t("notifications.broadcast.stats.totalShown")}
              value={stats.totalShown.toLocaleString()}
              icon={Megaphone}
              accentColor="indigo"
            />
            <StatCard
              title={t("notifications.broadcast.stats.inProgress")}
              value={stats.inProgressCount.toLocaleString()}
              description={t("notifications.broadcast.stats.activeQueue")}
              icon={Activity}
              accentColor="amber"
            />
            <StatCard
              title={t("notifications.broadcast.stats.totalRecipients")}
              value={stats.totalRecipients.toLocaleString()}
              description={t("notifications.broadcast.stats.deliveredSub", {
                delivered: stats.totalDelivered.toLocaleString(),
                total: stats.totalRecipients.toLocaleString(),
              })}
              icon={Users}
              accentColor="blue"
            />
            <StatCard
              title={t("notifications.broadcast.stats.readRate")}
              value={`${stats.readRatePct}%`}
              description={t("notifications.broadcast.stats.readSub", {
                read: stats.totalRead.toLocaleString(),
              })}
              icon={Eye}
              accentColor="emerald"
            />
          </div>

          {loadError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                <span>{loadError}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchHistory({ reset: true })}
                  className="shrink-0"
                >
                  {t("notifications.broadcast.table.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* History Table & Mobile Cards */}
          <Card className="border-border/80 bg-card/70 shadow-xs">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  {t("notifications.broadcast.table.historyTitle")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("notifications.broadcast.table.historySubtitle")}
                </CardDescription>
              </div>
              {hasInProgress && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 shrink-0">
                  <Loader2 className="size-3 animate-spin" />
                  {t("notifications.broadcast.table.inProgressPollHint")}
                </span>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {!hasLoadedInitial ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Megaphone className="size-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <p className="text-sm font-semibold text-foreground">
                      {t("notifications.broadcast.table.emptyTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("notifications.broadcast.table.emptyDesc")}
                    </p>
                  </div>
                  {canSend && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setComposerOpen(true)}
                      className="mt-1"
                    >
                      <Plus className="size-4 mr-2" />
                      {t("notifications.broadcast.createAction")}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-52">
                            {t("notifications.broadcast.table.title")}
                          </TableHead>
                          <TableHead>
                            {t("notifications.broadcast.table.severity")}
                          </TableHead>
                          <TableHead>
                            {t("notifications.broadcast.table.audience")}
                          </TableHead>
                          <TableHead>
                            {t("notifications.broadcast.table.status")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("notifications.broadcast.table.delivery")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("notifications.broadcast.table.read")}
                          </TableHead>
                          <TableHead>
                            {t("notifications.broadcast.table.sender")}
                          </TableHead>
                          <TableHead>
                            {t("notifications.broadcast.table.createdAt")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("notifications.broadcast.table.actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => handleOpenDetail(item.id)}
                          >
                            <TableCell className="font-medium text-foreground max-w-xs truncate">
                              {item.title}
                            </TableCell>
                            <TableCell>
                              <BroadcastSeverityBadge severity={item.severity} />
                            </TableCell>
                            <TableCell className="max-w-44">
                              <BroadcastAudiencePill
                                audience={item.audience}
                                roleNameMap={roleNameMap}
                              />
                            </TableCell>
                            <TableCell>
                              <BroadcastStatusBadge status={item.status} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              {item.deliveredCount}/{item.recipientCount}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              {item.readCount}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-36 truncate">
                              {resolveSenderName(item.senderId)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                              {formatShortDateTime(item.createdAt, locale)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenDetail(item.id);
                                }}
                              >
                                {t("notifications.broadcast.table.viewDetails")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="grid gap-3 p-4 md:hidden">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleOpenDetail(item.id)}
                        className="w-full rounded-lg border border-border bg-card p-3.5 text-left space-y-2.5 transition-colors hover:bg-muted/40 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground line-clamp-2">
                            {item.title}
                          </p>
                          <BroadcastStatusBadge status={item.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <BroadcastSeverityBadge severity={item.severity} />
                          <BroadcastAudiencePill
                            audience={item.audience}
                            roleNameMap={roleNameMap}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground tabular-nums">
                          <span>
                            {t("notifications.broadcast.table.delivery")}:{" "}
                            <strong className="text-foreground">
                              {item.deliveredCount}/{item.recipientCount}
                            </strong>{" "}
                            · {t("notifications.broadcast.table.read")}:{" "}
                            <strong className="text-foreground">
                              {item.readCount}
                            </strong>
                          </span>
                          <span>
                            {formatShortDateTime(item.createdAt, locale)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {nextCursor && (
                    <div className="flex justify-center border-t border-border/60 p-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoadingMore}
                        onClick={() => void handleLoadMore()}
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            {t("notifications.broadcast.table.loadingMore")}
                          </>
                        ) : (
                          t("notifications.broadcast.table.loadMore")
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {canSend && (
        <CreateBroadcastDialog
          open={composerOpen}
          onOpenChange={setComposerOpen}
          rolesState={rolesLookupState}
          membersState={membersLookupState}
          onCreated={handleCreated}
        />
      )}

      {canRead && (
        <BroadcastDetailSheet
          broadcastId={selectedId}
          initialItem={selectedItem}
          open={detailOpen}
          onOpenChange={handleDetailOpenChange}
          roles={roles}
          members={members}
          onItemUpdated={handleDetailUpdated}
        />
      )}
    </PageShell>
  );
}
