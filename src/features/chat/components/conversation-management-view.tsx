"use client";

import * as React from "react";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Eye,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActorDirectory } from "@/features/identity/client";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import {
  deleteConversationApi,
  listConversationsApi,
  updateConversationApi,
} from "../api/conversations.api";
import { AGENT_CONVERSATION_PERMISSIONS } from "../constants/conversation-permissions";
import type {
  ConversationListItem,
  ConversationPage,
  ConversationStatus,
} from "../schemas/conversation.schema";
import { ConversationDetailDialog } from "./conversation-detail-dialog";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

export function ConversationManagementView() {
  const { t, locale } = useTranslation();
  const { activeTenant, user, isSuperAdmin, hasPermission } = useAuth();

  const canManage =
    isSuperAdmin || hasPermission(AGENT_CONVERSATION_PERMISSIONS.MANAGE);

  const [scope, setScope] = React.useState<"org" | "mine">("org");
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | ConversationStatus
  >("ALL");
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [reloadTick, setReloadTick] = React.useState(0);

  const [loaded, setLoaded] = React.useState<{
    key: string;
    data: ConversationPage | null;
    error: string | null;
  } | null>(null);
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(
    null,
  );
  const [pendingDeleteItem, setPendingDeleteItem] =
    React.useState<ConversationListItem | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === debouncedQuery) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [debouncedQuery, searchInput]);

  const requestKey = JSON.stringify([
    activeTenant?.id ?? "",
    scope,
    statusFilter,
    debouncedQuery,
    page,
    reloadTick,
  ]);
  const current = loaded?.key === requestKey ? loaded : null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;
  const loading = current === null;

  React.useEffect(() => {
    const controller = new AbortController();
    listConversationsApi(
      {
        scope,
        page,
        pageSize: PAGE_SIZE,
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
      },
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setLoaded({ key: requestKey, data: result, error: null });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({
            key: requestKey,
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : t("chat.management.loadError"),
          });
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, page, requestKey, scope, statusFilter, t]);

  const reload = React.useCallback(() => setReloadTick((v) => v + 1), []);

  const handleToggleArchive = async (item: ConversationListItem) => {
    const nextStatus: ConversationStatus =
      item.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    setBusyId(item.threadId);
    try {
      await updateConversationApi(item.threadId, { status: nextStatus });
      toast.success(
        nextStatus === "ARCHIVED"
          ? t("chat.management.archiveSuccess")
          : t("chat.management.restoreSuccess"),
      );
      reload();
    } catch (cause: unknown) {
      toast.error(
        cause instanceof Error ? cause.message : t("chat.management.actionError"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteItem) return;
    const item = pendingDeleteItem;
    setBusyId(item.threadId);
    try {
      await deleteConversationApi(item.threadId);
      toast.success(t("chat.management.deleteSuccess"));
      setPendingDeleteItem(null);
      reload();
    } catch (cause: unknown) {
      toast.error(
        cause instanceof Error ? cause.message : t("chat.management.actionError"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const items = React.useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const actorIds = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.userId))),
    [items],
  );

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <MessageSquare className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {t("chat.management.title")}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t("chat.management.description")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTenant?.name ? (
            <Badge variant="outline" className="text-xs font-normal">
              {activeTenant.name}
            </Badge>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={reload}
          >
            <RefreshCw
              aria-hidden="true"
              className={loading ? "mr-1.5 size-3.5 animate-spin" : "mr-1.5 size-3.5"}
            />
            {t("chat.management.refresh")}
          </Button>
        </div>
      </header>

      {/* Filter Bar */}
      <section className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative min-w-0 lg:col-span-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("chat.management.searchPlaceholder")}
            className="pl-9"
            aria-label={t("chat.management.searchPlaceholder")}
          />
        </div>

        <Select
          value={scope}
          onValueChange={(value) => {
            setScope(value as "org" | "mine");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full" aria-label={t("chat.management.scopeLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="org">{t("chat.management.scopeOrg")}</SelectItem>
            <SelectItem value="mine">{t("chat.management.scopeMine")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as "ALL" | ConversationStatus);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full" aria-label={t("chat.management.statusLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("chat.management.statusAll")}</SelectItem>
            <SelectItem value="ACTIVE">
              {t("chat.management.status.ACTIVE")}
            </SelectItem>
            <SelectItem value="ARCHIVED">
              {t("chat.management.status.ARCHIVED")}
            </SelectItem>
          </SelectContent>
        </Select>
      </section>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden="true" className="size-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              {t("chat.management.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Conversations Table */}
      <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("chat.management.empty")}
          </div>
        ) : (
          <ActorDirectory actorIds={actorIds}>
            {(resolve) => (
              <Table aria-label={t("chat.management.title")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("chat.management.columns.title")}</TableHead>
                    <TableHead>{t("chat.management.columns.user")}</TableHead>
                    <TableHead>{t("chat.management.columns.status")}</TableHead>
                    <TableHead className="text-right">
                      {t("chat.management.columns.messages")}
                    </TableHead>
                    <TableHead>
                      {t("chat.management.columns.lastActivity")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("chat.management.columns.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const actor = resolve(item.userId);
                    const isOwner = user?.id === item.userId;
                    const canModifyRow = isOwner || canManage;
                    const rowBusy = busyId === item.threadId;

                    return (
                      <TableRow key={item.conversationId}>
                        <TableCell className="max-w-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedThreadId(item.threadId)}
                            className="line-clamp-1 cursor-pointer text-left font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {item.title || t("chat.management.untitled")}
                          </button>
                          {item.lastModel ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.lastModel}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {actor.kind === "known" ? (
                            <div>
                              <p className="font-medium text-foreground">
                                {actor.profile.displayName}
                              </p>
                              {actor.profile.email ? (
                                <p className="text-xs text-muted-foreground">
                                  {actor.profile.email}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t("chat.management.unknownUser")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "ACTIVE" ? "default" : "secondary"
                            }
                            className="text-xs font-normal"
                          >
                            {t(`chat.management.status.${item.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {item.messageCount}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                          {formatDateTime(item.lastMessageAt, locale)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setSelectedThreadId(item.threadId)}
                              aria-label={t("chat.management.viewDetail")}
                            >
                              <Eye className="size-4" />
                            </Button>
                            {canModifyRow ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  disabled={rowBusy}
                                  onClick={() => void handleToggleArchive(item)}
                                  aria-label={
                                    item.status === "ACTIVE"
                                      ? t("chat.management.archive")
                                      : t("chat.management.restore")
                                  }
                                >
                                  {item.status === "ACTIVE" ? (
                                    <Archive className="size-4" />
                                  ) : (
                                    <ArchiveRestore className="size-4" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  disabled={rowBusy}
                                  onClick={() => setPendingDeleteItem(item)}
                                  aria-label={t("chat.management.delete")}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ActorDirectory>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            {t("chat.management.paginationSummary", {
              count: items.length,
              total,
              page,
              pages: totalPages,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("chat.management.previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("chat.management.next")}
            </Button>
          </div>
        </div>
      </div>

      <ConversationDetailDialog
        threadId={selectedThreadId}
        open={selectedThreadId !== null}
        canManage={canManage}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedThreadId(null);
        }}
        onChanged={reload}
      />

      <Dialog
        open={pendingDeleteItem !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && busyId === null) setPendingDeleteItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("chat.management.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("chat.management.deleteConfirmDesc", {
                title:
                  pendingDeleteItem?.title || t("chat.management.untitled"),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busyId !== null}
              onClick={() => setPendingDeleteItem(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busyId !== null}
              onClick={() => void handleConfirmDelete()}
            >
              {busyId !== null ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 size-4" />
              )}
              {t("chat.management.confirmDeleteButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
