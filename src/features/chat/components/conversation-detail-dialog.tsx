"use client";

import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  Bot,
  Check,
  Eye,
  Loader2,
  MessageSquare,
  Pencil,
  Trash2,
  User,
  Wrench,
  X,
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
import { Skeleton } from "@/components/ui/skeleton";
import { ActorDirectory } from "@/features/identity/client";
import { formatDateTime } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  deleteConversationApi,
  getConversationDetailApi,
  updateConversationApi,
} from "../api/conversations.api";
import type { ConversationDetail } from "../schemas/conversation.schema";

interface ConversationDetailDialogProps {
  threadId: string | null;
  open: boolean;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function ConversationDetailDialog({
  threadId,
  open,
  canManage,
  onOpenChange,
  onChanged,
}: ConversationDetailDialogProps) {
  const { t, locale } = useTranslation();
  const [loaded, setLoaded] = React.useState<{
    threadId: string;
    detail: ConversationDetail | null;
    error: string | null;
  } | null>(null);
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState("");
  const [busyAction, setBusyAction] = React.useState<
    "rename" | "status" | "delete" | null
  >(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const currentLoaded =
    open && threadId && loaded?.threadId === threadId ? loaded : null;
  const detail = currentLoaded?.detail ?? null;
  const error = currentLoaded?.error ?? null;
  const loading = Boolean(open && threadId && currentLoaded === null);

  React.useEffect(() => {
    if (!open || !threadId) return;

    const controller = new AbortController();
    getConversationDetailApi(threadId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setLoaded({ threadId, detail: result, error: null });
          setTitleDraft(result.title ?? "");
          setEditingTitle(false);
          setConfirmDelete(false);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({
            threadId,
            detail: null,
            error:
              cause instanceof Error
                ? cause.message
                : t("chat.management.loadDetailError"),
          });
        }
      });

    return () => controller.abort();
  }, [open, t, threadId]);

  const canModify = Boolean(detail && (detail.isOwner || canManage));

  const handleSaveTitle = async () => {
    if (!detail) return;
    const trimmed = titleDraft.trim();
    if (!trimmed) return;
    setBusyAction("rename");
    try {
      const updated = await updateConversationApi(detail.threadId, {
        title: trimmed,
      });
      setLoaded((prev) =>
        prev && prev.detail
          ? { ...prev, detail: { ...prev.detail, title: updated.title } }
          : prev,
      );
      setEditingTitle(false);
      toast.success(t("chat.management.renameSuccess"));
      onChanged();
    } catch (cause: unknown) {
      toast.error(
        cause instanceof Error ? cause.message : t("chat.management.actionError"),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleArchive = async () => {
    if (!detail) return;
    const nextStatus = detail.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    setBusyAction("status");
    try {
      const updated = await updateConversationApi(detail.threadId, {
        status: nextStatus,
      });
      setLoaded((prev) =>
        prev && prev.detail
          ? { ...prev, detail: { ...prev.detail, status: updated.status } }
          : prev,
      );
      toast.success(
        nextStatus === "ARCHIVED"
          ? t("chat.management.archiveSuccess")
          : t("chat.management.restoreSuccess"),
      );
      onChanged();
    } catch (cause: unknown) {
      toast.error(
        cause instanceof Error ? cause.message : t("chat.management.actionError"),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    setBusyAction("delete");
    try {
      await deleteConversationApi(detail.threadId);
      toast.success(t("chat.management.deleteSuccess"));
      onOpenChange(false);
      onChanged();
    } catch (cause: unknown) {
      toast.error(
        cause instanceof Error ? cause.message : t("chat.management.actionError"),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleResumeInCopilot = () => {
    if (!detail || !detail.isOwner || detail.status !== "ACTIVE") return;
    onOpenChange(false);
    window.dispatchEvent(
      new CustomEvent("logix:open-copilot", {
        detail: { threadId: detail.threadId },
      }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-2 pr-6">
            <div className="min-w-0 flex-1 space-y-1">
              {editingTitle && detail ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={titleDraft}
                    maxLength={120}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    disabled={busyAction === "rename"}
                    className="h-8 text-sm"
                    aria-label={t("chat.management.titleLabel")}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyAction === "rename" || !titleDraft.trim()}
                    onClick={() => void handleSaveTitle()}
                  >
                    {busyAction === "rename" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTitle(false);
                      setTitleDraft(detail.title ?? "");
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="truncate text-base font-semibold">
                    {detail?.title || t("chat.management.untitled")}
                  </DialogTitle>
                  {canModify ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingTitle(true)}
                      aria-label={t("chat.management.rename")}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              )}
              <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
                {detail ? (
                  <>
                    <ActorDirectory actorIds={[detail.userId]}>
                      {(resolve) => {
                        const actor = resolve(detail.userId);
                        return (
                          <span>
                            {actor.kind === "known"
                              ? actor.profile.displayName
                              : t("chat.management.unknownUser")}
                          </span>
                        );
                      }}
                    </ActorDirectory>
                    <span>·</span>
                    <span>{formatDateTime(detail.lastMessageAt, locale)}</span>
                  </>
                ) : (
                  <span>{t("chat.management.detailLoading")}</span>
                )}
              </DialogDescription>
            </div>
            {detail ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={detail.status === "ACTIVE" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {t(`chat.management.status.${detail.status}`)}
                </Badge>
                {!detail.isOwner ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Eye className="size-3" />
                    {t("chat.management.readOnlyBadge")}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </DialogHeader>

        {/* Metrics Strip */}
        {detail ? (
          <div className="grid grid-cols-2 gap-3 border-b border-border bg-muted/30 px-6 py-3 text-xs sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">
                {t("chat.management.columns.messages")}
              </p>
              <p className="font-semibold tabular-nums text-foreground">
                {detail.messageCount}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("chat.management.executions")}
              </p>
              <p className="font-semibold tabular-nums text-foreground">
                {detail.executionCount}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("chat.management.lastModel")}
              </p>
              <p className="truncate font-medium text-foreground">
                {detail.lastModel ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("chat.management.tokens")}
              </p>
              <p className="font-semibold tabular-nums text-foreground">
                {detail.totalInputTokens.toLocaleString()} /{" "}
                {detail.totalOutputTokens.toLocaleString()}
              </p>
            </div>
          </div>
        ) : null}

        {/* Scrollable Message Timeline */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-3/4 rounded-lg" />
              <Skeleton className="ml-auto h-14 w-2/3 rounded-lg" />
              <Skeleton className="h-20 w-4/5 rounded-lg" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : detail && detail.messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("chat.management.noMessages")}
            </p>
          ) : detail ? (
            <div className="space-y-3">
              {detail.messages.map((msg) => {
                const isUser = msg.role === "USER";
                const isTool = msg.role === "TOOL";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-lg border p-3 text-sm",
                      isUser
                        ? "ml-6 border-primary/20 bg-primary/10 text-foreground"
                        : isTool
                          ? "border-border bg-muted/40 text-xs text-muted-foreground"
                          : "mr-6 border-border bg-card text-foreground",
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        {isUser ? (
                          <User className="size-3.5" />
                        ) : isTool ? (
                          <Wrench className="size-3.5" />
                        ) : (
                          <Bot className="size-3.5" />
                        )}
                        {t(`chat.management.roles.${msg.role}`)}
                      </span>
                      <span className="tabular-nums">
                        {formatDateTime(msg.createdAt, locale)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {detail ? (
          <DialogFooter className="flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-3 sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {canModify ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyAction !== null}
                    onClick={() => void handleToggleArchive()}
                  >
                    {detail.status === "ACTIVE" ? (
                      <>
                        <Archive className="mr-1.5 size-3.5" />
                        {t("chat.management.archive")}
                      </>
                    ) : (
                      <>
                        <ArchiveRestore className="mr-1.5 size-3.5" />
                        {t("chat.management.restore")}
                      </>
                    )}
                  </Button>
                  {confirmDelete ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busyAction !== null}
                        onClick={() => void handleDelete()}
                      >
                        {busyAction === "delete" ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1.5 size-3.5" />
                        )}
                        {t("chat.management.confirmDeleteButton")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={busyAction !== null}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="mr-1.5 size-3.5" />
                      {t("chat.management.delete")}
                    </Button>
                  )}
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {detail.isOwner && detail.status === "ACTIVE" ? (
                <Button type="button" size="sm" onClick={handleResumeInCopilot}>
                  <MessageSquare className="mr-1.5 size-3.5" />
                  {t("chat.management.resumeInCopilot")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t("common.close")}
              </Button>
            </div>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
