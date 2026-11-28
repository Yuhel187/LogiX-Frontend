"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestNewAccessToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import {
  archiveNotificationApi,
  getUnreadCountApi,
  listNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "../api/notifications.api";
import { createNotificationSocket } from "../lib/notification-socket";
import {
  applyArchive,
  applyMarkAllRead,
  applyMarkRead,
  MAX_DROPDOWN_NOTIFICATIONS,
  prependUniqueNotification,
} from "../lib/notification-state";
import {
  getSafeNotificationLink,
  NOTIFICATION_SEVERITIES,
  notificationCreatedEventSchema,
  unreadCountSchema,
  type NotificationItem,
} from "../schemas/notification.schema";

interface NotificationState {
  sessionKey: string | null;
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
}

const INITIAL_STATE: NotificationState = {
  sessionKey: null,
  items: [],
  unreadCount: 0,
  isLoading: false,
  isConnected: false,
  error: null,
};

export interface NotificationContextValue {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

function isAuthSocketError(reasonOrMessage: string): boolean {
  const normalized = reasonOrMessage.toLowerCase();
  return (
    reasonOrMessage === "UNAUTHORIZED" ||
    normalized.includes("unauthorized") ||
    normalized.includes("token") ||
    normalized.includes("jwt")
  );
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, activeTenant, isAuthenticated, tenantTransition } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const activeSessionKey =
    isAuthenticated &&
    user?.id &&
    activeTenant?.id &&
    tenantTransition === "idle"
      ? `${user.id}:${activeTenant.id}`
      : null;

  const activeTenantId = activeTenant?.id ?? null;

  const [state, setState] = useState<NotificationState>(INITIAL_STATE);
  const stateRef = useRef<NotificationState>(state);
  const activeSessionKeyRef = useRef<string | null>(activeSessionKey);
  const hasConnectedOnceRef = useRef(false);
  const authRetryCountRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    activeSessionKeyRef.current = activeSessionKey;
  }, [activeSessionKey]);

  const hydrateSession = useCallback(
    async (sessionKey: string, signal?: AbortSignal) => {
      try {
        const [listRes, countRes] = await Promise.all([
          listNotificationsApi({ limit: MAX_DROPDOWN_NOTIFICATIONS }, signal),
          getUnreadCountApi(signal),
        ]);
        if (signal?.aborted || activeSessionKeyRef.current !== sessionKey) {
          return;
        }
        setState((prev) => ({
          ...prev,
          sessionKey,
          items: listRes.items,
          unreadCount: countRes.count,
          isLoading: false,
          error: null,
        }));
      } catch (err) {
        if (signal?.aborted || activeSessionKeyRef.current !== sessionKey) {
          return;
        }
        const message =
          err instanceof Error && err.message
            ? err.message
            : t("notifications.loadError");
        setState((prev) => ({
          ...prev,
          sessionKey,
          isLoading: false,
          error: message,
        }));
      }
    },
    [t],
  );

  const refresh = useCallback(async () => {
    const sessionKey = activeSessionKeyRef.current;
    if (!sessionKey) return;
    setState((prev) => ({
      ...(prev.sessionKey === sessionKey ? prev : INITIAL_STATE),
      sessionKey,
      isLoading: true,
      error: null,
    }));
    await hydrateSession(sessionKey);
  }, [hydrateSession]);

  const markRead = useCallback(
    async (id: string) => {
      const sessionKey = activeSessionKeyRef.current;
      if (!sessionKey) return;

      const snapshot = stateRef.current;
      const nowIso = new Date().toISOString();

      setState((prev) => {
        if (prev.sessionKey !== sessionKey) return prev;
        const { items, changed } = applyMarkRead(prev.items, id, nowIso);
        if (!changed) return prev;
        return {
          ...prev,
          items,
          unreadCount: Math.max(0, prev.unreadCount - 1),
        };
      });

      try {
        await markNotificationReadApi(id);
      } catch {
        if (activeSessionKeyRef.current === sessionKey) {
          setState((prev) =>
            prev.sessionKey === sessionKey
              ? {
                  ...prev,
                  items: snapshot.items,
                  unreadCount: snapshot.unreadCount,
                }
              : prev,
          );
        }
        toast.error(t("notifications.actionError"));
      }
    },
    [t],
  );

  const markAllRead = useCallback(async () => {
    const sessionKey = activeSessionKeyRef.current;
    if (!sessionKey) return;

    const snapshot = stateRef.current;
    const nowIso = new Date().toISOString();

    setState((prev) => {
      if (prev.sessionKey !== sessionKey) return prev;
      return {
        ...prev,
        items: applyMarkAllRead(prev.items, nowIso),
        unreadCount: 0,
      };
    });

    try {
      await markAllNotificationsReadApi();
      toast.success(t("notifications.markAllReadSuccess"));
    } catch {
      if (activeSessionKeyRef.current === sessionKey) {
        setState((prev) =>
          prev.sessionKey === sessionKey
            ? {
                ...prev,
                items: snapshot.items,
                unreadCount: snapshot.unreadCount,
              }
            : prev,
        );
      }
      toast.error(t("notifications.actionError"));
    }
  }, [t]);

  const archive = useCallback(
    async (id: string) => {
      const sessionKey = activeSessionKeyRef.current;
      if (!sessionKey) return;

      const snapshot = stateRef.current;

      setState((prev) => {
        if (prev.sessionKey !== sessionKey) return prev;
        const { items, removedUnread } = applyArchive(prev.items, id);
        return {
          ...prev,
          items,
          unreadCount: removedUnread
            ? Math.max(0, prev.unreadCount - 1)
            : prev.unreadCount,
        };
      });

      try {
        await archiveNotificationApi(id);
      } catch {
        if (activeSessionKeyRef.current === sessionKey) {
          setState((prev) =>
            prev.sessionKey === sessionKey
              ? {
                  ...prev,
                  items: snapshot.items,
                  unreadCount: snapshot.unreadCount,
                }
              : prev,
          );
        }
        toast.error(t("notifications.actionError"));
      }
    },
    [t],
  );

  const markReadRef = useRef(markRead);
  useEffect(() => {
    markReadRef.current = markRead;
  }, [markRead]);

  const showIncomingToast = useCallback(
    (item: NotificationItem) => {
      const safeLink = getSafeNotificationLink(item.link);
      const toastOptions = {
        description: item.body,
        ...(safeLink
          ? {
              action: {
                label: t("notifications.viewDetail"),
                onClick: () => {
                  void markReadRef.current(item.id);
                  router.push(safeLink);
                },
              },
            }
          : {}),
      };

      if (item.severity === NOTIFICATION_SEVERITIES.CRITICAL) {
        toast.error(item.title, toastOptions);
      } else if (item.severity === NOTIFICATION_SEVERITIES.WARNING) {
        toast.warning(item.title, toastOptions);
      } else {
        toast.info(item.title, toastOptions);
      }
    },
    [router, t],
  );

  useEffect(() => {
    if (!activeSessionKey || !activeTenantId) {
      hasConnectedOnceRef.current = false;
      authRetryCountRef.current = 0;
      return;
    }

    hasConnectedOnceRef.current = false;
    authRetryCountRef.current = 0;

    const controller = new AbortController();
    const socket = createNotificationSocket();

    const tryRefreshTokenAndReconnect = () => {
      if (authRetryCountRef.current >= 1) return;
      authRetryCountRef.current += 1;
      void requestNewAccessToken()
        .then(() => {
          if (
            !controller.signal.aborted &&
            activeSessionKeyRef.current === activeSessionKey
          ) {
            socket.connect();
          }
        })
        .catch(() => {
          // Handled by AuthContext session expiration flow.
        });
    };

    socket.on("connect", () => {
      if (activeSessionKeyRef.current !== activeSessionKey) return;
      authRetryCountRef.current = 0;
      setState((prev) => ({
        ...(prev.sessionKey === activeSessionKey ? prev : INITIAL_STATE),
        sessionKey: activeSessionKey,
        isConnected: true,
      }));
      if (hasConnectedOnceRef.current) {
        void hydrateSession(activeSessionKey, controller.signal);
      } else {
        hasConnectedOnceRef.current = true;
      }
    });

    socket.on("disconnect", (reason) => {
      if (activeSessionKeyRef.current !== activeSessionKey) return;
      setState((prev) =>
        prev.sessionKey === activeSessionKey
          ? { ...prev, isConnected: false }
          : prev,
      );
      if (reason === "io server disconnect") {
        tryRefreshTokenAndReconnect();
      }
    });

    socket.on("connect_error", (err) => {
      if (activeSessionKeyRef.current !== activeSessionKey) return;
      setState((prev) =>
        prev.sessionKey === activeSessionKey
          ? { ...prev, isConnected: false }
          : prev,
      );
      if (isAuthSocketError(err.message)) {
        tryRefreshTokenAndReconnect();
      }
    });

    socket.on("notification.created", (raw: unknown) => {
      if (activeSessionKeyRef.current !== activeSessionKey) return;
      const parsed = notificationCreatedEventSchema.safeParse(raw);
      if (!parsed.success) return;

      const { tenantId: eventTenantId, ...item } = parsed.data;
      if (eventTenantId && eventTenantId !== activeTenantId) return;

      let wasAdded = false;
      setState((prev) => {
        const base =
          prev.sessionKey === activeSessionKey ? prev : INITIAL_STATE;
        const merged = prependUniqueNotification(base.items, item);
        wasAdded = merged.added;
        return {
          ...base,
          sessionKey: activeSessionKey,
          items: merged.items,
        };
      });

      if (wasAdded) {
        showIncomingToast(item);
      }
    });

    socket.on("notification.unread-count", (raw: unknown) => {
      if (activeSessionKeyRef.current !== activeSessionKey) return;
      const parsed = unreadCountSchema.safeParse(raw);
      if (!parsed.success) return;

      setState((prev) => ({
        ...(prev.sessionKey === activeSessionKey ? prev : INITIAL_STATE),
        sessionKey: activeSessionKey,
        unreadCount: parsed.data.count,
      }));
    });

    void hydrateSession(activeSessionKey, controller.signal);
    socket.connect();

    return () => {
      controller.abort();
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [activeSessionKey, activeTenantId, hydrateSession, showIncomingToast]);

  const value = useMemo<NotificationContextValue>(() => {
    const isCurrent =
      activeSessionKey !== null && state.sessionKey === activeSessionKey;
    return {
      items: isCurrent ? state.items : [],
      unreadCount: isCurrent ? state.unreadCount : 0,
      isLoading: isCurrent ? state.isLoading : Boolean(activeSessionKey),
      isConnected: isCurrent ? state.isConnected : false,
      error: isCurrent ? state.error : null,
      refresh,
      markRead,
      markAllRead,
      archive,
    };
  }, [activeSessionKey, state, refresh, markRead, markAllRead, archive]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
