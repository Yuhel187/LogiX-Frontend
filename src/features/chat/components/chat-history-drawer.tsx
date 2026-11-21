"use client";

import * as React from "react";
import {
  Check,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import type { ChatThread } from "@/features/chat/hooks/use-chat-threads";
import { cn } from "@/lib/utils";

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  threads: ChatThread[];
  activeThreadId: string;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => Promise<boolean>;
  isLoading: boolean;
  isExpanded?: boolean;
}

type GroupKey = "today" | "yesterday" | "last7Days" | "older";

function getGroupKey(dateStr: string): GroupKey {
  const d = new Date(dateStr);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOf7DaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const time = d.getTime();
  if (time >= startOfToday) return "today";
  if (time >= startOfYesterday) return "yesterday";
  if (time >= startOf7DaysAgo) return "last7Days";
  return "older";
}

export function ChatHistoryDrawer({
  isOpen,
  onClose,
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDeleteThread,
  isLoading,
  isExpanded = false,
}: ChatHistoryDrawerProps) {
  const { t } = useTranslation();
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const grouped = React.useMemo(() => {
    const groups: Record<GroupKey, ChatThread[]> = {
      today: [],
      yesterday: [],
      last7Days: [],
      older: [],
    };
    for (const thread of threads) {
      const key = getGroupKey(thread.updatedAt || thread.createdAt);
      groups[key].push(thread);
    }
    return groups;
  }, [threads]);

  if (!isOpen) return null;

  const groupLabels: Record<GroupKey, string> = {
    today: t("chat.today"),
    yesterday: t("chat.yesterday"),
    last7Days: t("chat.last7Days"),
    older: t("chat.older"),
  };

  const groupKeys: GroupKey[] = ["today", "yesterday", "last7Days", "older"];

  async function handleConfirmDelete(e: React.MouseEvent, threadId: string) {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      const success = await onDeleteThread(threadId);
      if (success && threadId === activeThreadId) {
        onNewChat();
      }
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" aria-modal="true" role="dialog">
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "relative z-10 flex h-full w-80 max-w-[90vw] flex-col bg-background text-foreground shadow-2xl border-border/80",
          isExpanded ? "mr-auto border-r" : "ml-auto border-l"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-primary" />
            <span>{t("chat.chatHistory")}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onClose}
            title={t("chat.closeHistory")}
            aria-label={t("chat.closeHistory")}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-3">
          <Button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="h-9 w-full justify-start gap-2 rounded-xl px-3 text-sm font-medium cursor-pointer"
          >
            <Plus className="size-4 shrink-0" />
            <span className="truncate">{t("chat.newChat")}</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4 select-none">
          {isLoading && threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs">{t("chat.initializingHistory")}</span>
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-muted-foreground">
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted/60">
                <MessageSquare className="size-5 text-muted-foreground/60" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("chat.noHistory")}
              </p>
            </div>
          ) : (
            groupKeys.map((key) => {
              const items = grouped[key];
              if (items.length === 0) return null;
              return (
                <div key={key} className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {groupLabels[key]}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = item.threadId === activeThreadId;
                      const isConfirming = confirmDeleteId === item.threadId;
                      return (
                        <div
                          key={item.threadId}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (isConfirming) return;
                            onSelectThread(item.threadId);
                            onClose();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (isConfirming) return;
                              onSelectThread(item.threadId);
                              onClose();
                            }
                          }}
                          className={cn(
                            "group relative flex w-full items-center justify-between rounded-xl border px-2.5 py-2 text-left text-xs transition-all cursor-pointer",
                            isActive
                              ? "border-primary/25 bg-primary/10 font-medium text-primary"
                              : "border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2 pr-2">
                            <MessageSquare
                              className={cn(
                                "size-3.5 shrink-0",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground/60 group-hover:text-foreground"
                              )}
                            />
                            <span className="truncate">
                              {item.title || t("chat.untitledThread")}
                            </span>
                          </div>

                          <div
                            className="flex shrink-0 items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isConfirming ? (
                              <div className="flex items-center gap-1 rounded-lg border border-border bg-background/95 p-0.5 shadow-xs">
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={(e) => handleConfirmDelete(e, item.threadId)}
                                  className="flex size-6 items-center justify-center rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                  title={t("chat.delete")}
                                  aria-label={t("chat.delete")}
                                >
                                  {isDeleting ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Check className="size-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                                  title={t("chat.cancel")}
                                  aria-label={t("chat.cancel")}
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.threadId)}
                                className="flex size-6 items-center justify-center rounded text-muted-foreground/70 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                                title={t("chat.deleteChat")}
                                aria-label={t("chat.deleteChat")}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
