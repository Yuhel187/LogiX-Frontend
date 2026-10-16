"use client";

import * as React from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { useAuth } from "@/lib/auth";

export interface CopilotChatProviderProps {
  children: React.ReactNode;
}

const isClientSnapshot = () => true;
const isServerSnapshot = () => false;
const noopSubscribe = () => () => {};

export function CopilotChatProvider({ children }: CopilotChatProviderProps) {
  const { accessToken } = useAuth();
  const isClient = React.useSyncExternalStore(
    noopSubscribe,
    isClientSnapshot,
    isServerSnapshot
  );
  const runtimeUrl =
    process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL ?? "/api/copilotkit";
  // Follows token refreshes so the agent never receives an expired token.
  const headers = React.useMemo(() => {
    const result: Record<string, string> = {};
    if (accessToken) result.Authorization = `Bearer ${accessToken}`;
    return result;
  }, [accessToken]);

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <CopilotKit
      runtimeUrl={runtimeUrl}
      headers={headers}
      useSingleEndpoint={false}
    >
      {children}
    </CopilotKit>
  );
}
