"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getOrCreateSessionId } from "@/features/chat/lib/session";

export interface ChatThread {
  threadId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useChatThreads() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken, isAuthenticated, isLoading: authLoading, activeTenant, user } =
    useAuth();

  const fetchThreads = useCallback(async () => {
    if (authLoading || !isAuthenticated || !accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const sessionId = getOrCreateSessionId();
      const res = await fetch("/api/agent/threads", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(sessionId ? { "x-logix-chat-session-id": sessionId } : {}),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch threads: ${res.statusText}`);
      }
      const data: ChatThread[] = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[useChatThreads] fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load threads");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, authLoading, isAuthenticated]);

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!accessToken) return false;
      const previous = [...threads];
      setThreads((prev) => prev.filter((t) => t.threadId !== threadId));

      try {
        const sessionId = getOrCreateSessionId();
        const res = await fetch(
          `/api/agent/threads/${encodeURIComponent(threadId)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              ...(sessionId ? { "x-logix-chat-session-id": sessionId } : {}),
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to delete thread");
        }
        return true;
      } catch (err) {
        console.error("[useChatThreads] delete error:", err);
        setThreads(previous);
        return false;
      }
    },
    [accessToken, threads]
  );

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (authLoading || !isAuthenticated || !accessToken) {
        setThreads([]);
        return;
      }
      if (!ignore) {
        await fetchThreads();
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [accessToken, activeTenant?.id, authLoading, fetchThreads, isAuthenticated, user?.id]);

  return {
    threads,
    isLoading,
    error,
    fetchThreads,
    deleteThread,
  };
}
