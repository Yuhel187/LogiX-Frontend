"use client";

import * as React from "react";
import Image from "next/image";
import { History, Maximize2, Minimize2, Plus, Sparkles } from "lucide-react";
import {
  CopilotSidebar,
  useDefaultRenderTool,
  useInterrupt,
} from "@copilotkit/react-core/v2";
import { ChatHistoryDrawer } from "./chat-history-drawer";
import { UniversalApprovalCard } from "./universal-approval-card";
import { useChatThreads } from "@/features/chat/hooks/use-chat-threads";
import { normalizeApprovalData } from "@/features/chat/lib/parse-approval-data";
import {
  createNewThreadId,
  getInitialThreadId,
  saveThreadId,
  syncThreadScope,
} from "@/features/chat/lib/session";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

const DEFAULT_SIDEBAR_WIDTH = 400;
const HIDE_TOOL_RESULTS_CONFIG = { render: () => <></> };

export interface LogixCopilotSidebarProps {
  defaultOpen?: boolean;
  agentId?: string;
  width?: number;
}

interface LogixCopilotSidebarContentProps {
  agentId: string;
  threadId: string;
  chatResetVersion: number;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  defaultOpen: boolean;
  width: number;
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

function LogixCopilotSidebarContent({
  agentId,
  threadId,
  chatResetVersion,
  onSelectThread,
  onNewChat,
  defaultOpen,
  width,
  isExpanded,
  setIsExpanded,
}: LogixCopilotSidebarContentProps) {
  const { t } = useTranslation();
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const { threads, isLoading: isLoadingThreads, fetchThreads, deleteThread } =
    useChatThreads();

  const isProduction = process.env.NODE_ENV === "production";
  const showToolResults =
    process.env.NEXT_PUBLIC_SHOW_TOOL_RESULTS !== undefined
      ? process.env.NEXT_PUBLIC_SHOW_TOOL_RESULTS === "true"
      : !isProduction;

  useDefaultRenderTool(
    showToolResults ? undefined : HIDE_TOOL_RESULTS_CONFIG
  );

  useInterrupt({
    render: ({ event, interrupt, resolve, cancel }) => {
      const data = normalizeApprovalData(interrupt, event);
      return (
        <UniversalApprovalCard
          data={data}
          onResolve={(decision) => resolve(decision, interrupt?.id)}
          onCancel={() => cancel(interrupt?.id)}
        />
      );
    },
  });

  const fetchThreadsRef = React.useRef(fetchThreads);
  React.useEffect(() => {
    fetchThreadsRef.current = fetchThreads;
  }, [fetchThreads]);

  const handleOpenHistory = React.useCallback(() => {
    setIsHistoryOpen(true);
    void fetchThreadsRef.current();
  }, []);

  const handleHeaderNewChat = React.useCallback(() => {
    onNewChat();
    void fetchThreadsRef.current();
  }, [onNewChat]);

  const headerSlot = React.useMemo(
    () => ({
      children: ({
        closeButton,
        title,
      }: {
        closeButton?: React.ReactNode;
        title?: React.ReactNode;
      }) => (
        <div
          className={`flex w-full items-center justify-between border-b border-border/80 ${isExpanded ? "px-6 sm:px-10 py-4" : "px-4 sm:px-5 py-3.5"
            } bg-background/95 backdrop-blur-md shrink-0 transition-colors`}
        >
          {/* Brand & AI Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5">
              {/* Expand / Collapse Full Page Button */}
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                title={
                  isExpanded
                    ? t("chat.collapse") || "Thu nhỏ"
                    : t("chat.expand") || "Mở rộng toàn màn hình"
                }
                aria-label={
                  isExpanded ? "Collapse sidebar" : "Expand to full page"
                }
              >
                {isExpanded ? (
                  <Minimize2 className="h-[18px] w-[18px] stroke-[2] text-primary" />
                ) : (
                  <Maximize2 className="h-[18px] w-[18px] stroke-[2]" />
                )}
              </button>
            </div>

            <div className="flex size-7 items-center justify-center rounded-lg overflow-hidden shadow-xs border border-border/50 bg-background shrink-0">
              <Image
                src="/fav_logo_logix.png"
                alt="LogiX Logo"
                width={28}
                height={28}
                className="size-full object-contain p-0.5"
              />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`font-bold ${isExpanded ? "text-lg sm:text-xl" : "text-base sm:text-lg"
                  } text-foreground tracking-tight truncate`}
              >
                {title || t("chat.appTitle") || "LogiX Copilot"}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-3" />
                AI
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenHistory}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
              title={t("chat.history") || "Lịch sử hội thoại"}
              aria-label="Chat history"
            >
              <History className="h-[19px] w-[19px] stroke-[2]" />
            </button>

            {/* New Thread Button */}
            <button
              type="button"
              onClick={handleHeaderNewChat}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
              title={t("chat.newChat") || "Cuộc trò chuyện mới"}
              aria-label="New chat thread"
            >
              <Plus className="h-[21px] w-[21px] stroke-[2.25]" />
            </button>

            {/* Close Button with expand reset */}
            <div
              onClick={() => {
                if (isExpanded) setIsExpanded(false);
              }}
              className="inline-flex items-center justify-center shrink-0 [&_button]:!h-9 [&_button]:!w-9 [&_button]:!inline-flex [&_button]:!items-center [&_button]:!justify-center [&_button]:!p-0 [&_button]:!m-0 [&_button]:!rounded-lg [&_button]:!text-muted-foreground [&_button]:hover:!text-foreground [&_button]:hover:!bg-muted [&_button]:!transition-colors [&_button]:!cursor-pointer [&_button]:!shrink-0 [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!static [&_button]:!transform-none [&_svg]:!h-[18px] [&_svg]:!w-[18px] [&_svg]:!stroke-[2.25]"
            >
              {closeButton}
            </div>
          </div>
        </div>
      ),
    }),
    [handleHeaderNewChat, handleOpenHistory, isExpanded, setIsExpanded, t]
  );

  const labelsSlot = React.useMemo(
    () => ({
      modalHeaderTitle: t("chat.appTitle") || "LogiX Copilot",
      welcomeMessageText:
        t("chat.welcomeMessage") ||
        "Xin chào! Tôi là Trợ lý AI của LogiX. Tôi có thể hỗ trợ gì cho việc quản lý vận hành kho bãi và logistics của bạn hôm nay?",
      chatInputPlaceholder:
        t("chat.inputPlaceholder") || "Nhập tin nhắn của bạn...",
    }),
    [t]
  );

  return (
    <>
      <CopilotSidebar
        agentId={agentId}
        threadId={threadId}
        // Remount when thread changes so CopilotKit triggers connectAgent() and replays history from SQLite.
        key={`${threadId}:${chatResetVersion}`}
        defaultOpen={defaultOpen}
        width={isExpanded ? "100vw" : width}
        header={headerSlot}
        labels={labelsSlot}
      />

      {isHistoryOpen ? (
        <ChatHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          threads={threads}
          activeThreadId={threadId}
          onSelectThread={onSelectThread}
          onNewChat={() => {
            onNewChat();
            void fetchThreads();
          }}
          onDeleteThread={deleteThread}
          isLoading={isLoadingThreads}
          isExpanded={isExpanded}
        />
      ) : null}
    </>
  );
}

export function LogixCopilotSidebar({
  defaultOpen = false,
  agentId = "default",
  width = DEFAULT_SIDEBAR_WIDTH,
}: LogixCopilotSidebarProps) {
  const { user, activeTenant } = useAuth();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [threadId, setThreadId] = React.useState("");
  const [chatResetVersion, setChatResetVersion] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const scope = user?.id ? `${user.id}:${activeTenant?.id ?? ""}` : "";
      const rotated = scope ? syncThreadScope(scope) : null;
      if (rotated) {
        setThreadId(rotated);
        setChatResetVersion((v) => v + 1);
      } else {
        setThreadId(getInitialThreadId());
      }
    }, 0);

    const handleSync = () => {
      const current = getInitialThreadId();
      if (current) {
        setThreadId(current);
      }
    };

    window.addEventListener("focus", handleSync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", handleSync);
    };
  }, [activeTenant?.id, user?.id]);

  React.useEffect(() => {
    document.body.classList.toggle("copilot-sidebar-expanded", isExpanded);

    return () => {
      document.body.classList.remove("copilot-sidebar-expanded");
    };
  }, [isExpanded]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  // Listen for programmatic open events (e.g. from header button or global command palette)
  React.useEffect(() => {
    const handleOpenRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ prompt?: string }>;
      const promptText = customEvent.detail?.prompt?.trim();

      const openSidebarIfClosed = () => {
        const toggleBtn = document.querySelector(
          'button[data-slot="chat-toggle-button"], button[data-testid="copilot-chat-toggle"], [data-copilot-sidebar-trigger], button[aria-label*="Copilot"], button[aria-label*="Chat"], button[data-testid="copilot-trigger"]'
        ) as HTMLButtonElement | null;
        const aside = document.querySelector(
          "aside[data-copilot-sidebar]"
        ) as HTMLElement | null;

        const isClosed =
          toggleBtn?.getAttribute("data-state") === "closed" ||
          aside?.getAttribute("aria-hidden") === "true";

        if (toggleBtn && isClosed) {
          toggleBtn.click();
        }
      };

      // Trigger after Radix Dialog closes so pointer/focus events don't conflict
      window.setTimeout(openSidebarIfClosed, 30);

      // Focus chat textarea (and populate prompt if provided) once sidebar opens
      const focusAndFill = () => {
        const inputEl = document.querySelector(
          'aside[data-copilot-sidebar] [data-testid="copilot-chat-input"] textarea, aside[data-copilot-sidebar] textarea'
        ) as HTMLTextAreaElement | null;
        if (!inputEl) return;

        if (promptText) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value"
          )?.set;
          if (nativeSetter) {
            nativeSetter.call(inputEl, promptText);
          } else {
            inputEl.value = promptText;
          }
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
        inputEl.focus();
      };

      window.setTimeout(focusAndFill, 200);
    };

    window.addEventListener("logix:open-copilot", handleOpenRequest);
    return () =>
      window.removeEventListener("logix:open-copilot", handleOpenRequest);
  }, []);

  const handleSelectThread = React.useCallback(
    (selectedId: string) => {
      if (selectedId === threadId) return;
      saveThreadId(selectedId);
      setThreadId(selectedId);
      setChatResetVersion((v) => v + 1);
    },
    [threadId]
  );

  const handleNewChat = React.useCallback(() => {
    const nextId = createNewThreadId();
    setThreadId(nextId);
    setChatResetVersion(0);
  }, []);

  if (!threadId) {
    return null;
  }

  return (
    <LogixCopilotSidebarContent
      agentId={agentId}
      threadId={threadId}
      chatResetVersion={chatResetVersion}
      onSelectThread={handleSelectThread}
      onNewChat={handleNewChat}
      defaultOpen={defaultOpen}
      width={width}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
    />
  );
}
