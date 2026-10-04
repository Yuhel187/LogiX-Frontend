"use client";

import * as React from "react";
import Image from "next/image";
import { Maximize2, Minimize2, Plus, Sparkles } from "lucide-react";
import { CopilotSidebar } from "@copilotkit/react-core/v2";
import { createNewThreadId, getInitialThreadId } from "@/features/chat/lib/session";
import { useTranslation } from "@/lib/i18n";

const DEFAULT_SIDEBAR_WIDTH = 400;

export interface LogixCopilotSidebarProps {
  defaultOpen?: boolean;
  agentId?: string;
  width?: number;
}

export function LogixCopilotSidebar({
  defaultOpen = true,
  agentId = "default",
  width = DEFAULT_SIDEBAR_WIDTH,
}: LogixCopilotSidebarProps) {
  const { t, locale } = useTranslation();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [threadId, setThreadId] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setThreadId(getInitialThreadId());
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
  }, []);

  React.useEffect(() => {
    if (isExpanded) {
      document.body.classList.add("copilot-sidebar-expanded");
    } else {
      document.body.classList.remove("copilot-sidebar-expanded");

      const syncBodyMargin = () => {
        if (typeof window === "undefined") return;
        const isDesktop = window.matchMedia("(min-width: 768px)").matches;
        const aside = document.querySelector(
          "aside[data-copilot-sidebar]"
        ) as HTMLElement | null;
        const isSidebarOpen =
          aside && aside.getAttribute("aria-hidden") !== "true";
        if (isDesktop && isSidebarOpen) {
          document.body.style.marginInlineEnd = `${width}px`;
        } else {
          document.body.style.marginInlineEnd = "";
        }
      };

      syncBodyMargin();
      window.addEventListener("resize", syncBodyMargin);
      return () => {
        window.removeEventListener("resize", syncBodyMargin);
      };
    }

    return () => {
      document.body.classList.remove("copilot-sidebar-expanded");
    };
  }, [isExpanded, width]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  // Listen for programmatic open events (e.g. from header button)
  React.useEffect(() => {
    const handleOpenRequest = () => {
      const aside = document.querySelector(
        "aside[data-copilot-sidebar]"
      ) as HTMLElement | null;
      if (aside && aside.getAttribute("aria-hidden") === "true") {
        // Find and click the toggle button
        const trigger = document.querySelector(
          "[data-copilot-sidebar-trigger], button[aria-label*='Copilot'], button[aria-label*='Chat'], button[data-testid='copilot-trigger']"
        ) as HTMLElement | null;
        if (trigger) {
          trigger.click();
        }
      }
    };

    window.addEventListener("logix:open-copilot", handleOpenRequest);
    return () => window.removeEventListener("logix:open-copilot", handleOpenRequest);
  }, []);

  if (!threadId) {
    return null;
  }

  return (
    <CopilotSidebar
      agentId={agentId}
      threadId={threadId}
      key={`${threadId}:${locale}`}
      defaultOpen={defaultOpen}
      width={isExpanded ? "100vw" : width}
      header={{
        children: ({
          closeButton,
          title,
        }: {
          closeButton?: React.ReactNode;
          title?: React.ReactNode;
        }) => (
          <div
            className={`flex w-full items-center justify-between border-b border-border/80 ${
              isExpanded ? "px-6 sm:px-10 py-4" : "px-4 sm:px-5 py-3.5"
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
                  className={`font-bold ${
                    isExpanded ? "text-lg sm:text-xl" : "text-base sm:text-lg"
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
              {/* New Thread Button */}
              <button
                type="button"
                onClick={() => {
                  setThreadId(createNewThreadId());
                }}
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
                  document.body.style.marginInlineEnd = "";
                }}
                className="inline-flex items-center justify-center shrink-0 [&_button]:!h-9 [&_button]:!w-9 [&_button]:!inline-flex [&_button]:!items-center [&_button]:!justify-center [&_button]:!p-0 [&_button]:!m-0 [&_button]:!rounded-lg [&_button]:!text-muted-foreground [&_button]:hover:!text-foreground [&_button]:hover:!bg-muted [&_button]:!transition-colors [&_button]:!cursor-pointer [&_button]:!shrink-0 [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!static [&_button]:!transform-none [&_svg]:!h-[18px] [&_svg]:!w-[18px] [&_svg]:!stroke-[2.25]"
              >
                {closeButton}
              </div>
            </div>
          </div>
        ),
      }}
      labels={{
        modalHeaderTitle: t("chat.appTitle") || "LogiX Copilot",
        welcomeMessageText:
          t("chat.welcomeMessage") ||
          "Xin chào! Tôi là Trợ lý AI của LogiX. Tôi có thể hỗ trợ gì cho việc quản lý vận hành kho bãi và logistics của bạn hôm nay?",
        chatInputPlaceholder:
          t("chat.inputPlaceholder") || "Nhập tin nhắn của bạn...",
      }}
    />
  );
}
