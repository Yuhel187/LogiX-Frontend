"use client";

import * as React from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { useAuth } from "@/lib/auth";
import { getOrCreateSessionId } from "@/features/chat/lib/session";

export interface CopilotChatProviderProps {
  children: React.ReactNode;
}

const isClientSnapshot = () => true;
const isServerSnapshot = () => false;
const noopSubscribe = () => () => {};

export function CopilotChatProvider({ children }: CopilotChatProviderProps) {
  const { accessToken, isLoading } = useAuth();
  const isClient = React.useSyncExternalStore(
    noopSubscribe,
    isClientSnapshot,
    isServerSnapshot
  );
  const runtimeUrl =
    process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL ?? "/api/copilotkit";

  React.useEffect(() => {
    try {
      window.localStorage.setItem("cpk:inspector:telemetry:opt_out", "true");
    } catch {
      // Ignore storage access errors in restricted browser contexts.
    }
  }, []);

  // Follows token refreshes so the agent never receives an expired token.
  const headers = React.useMemo(() => {
    const result: Record<string, string> = {};
    if (isClient) {
      const sessionId = getOrCreateSessionId();
      if (sessionId) result["x-logix-chat-session-id"] = sessionId;
    }
    if (accessToken) result.Authorization = `Bearer ${accessToken}`;
    return result;
  }, [accessToken, isClient]);

  // Wait for hydration and resolved accessToken so mount-time /connect always carries JWT.
  if (!isClient || isLoading || !accessToken) {
    return <>{children}</>;
  }

  return (
    <CopilotKit
      runtimeUrl={runtimeUrl}
      headers={headers}
      useSingleEndpoint={false}
      enableInspector={false}
      showDevConsole={false}
    >
      {children}
    </CopilotKit>
  );
}
