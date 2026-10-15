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
  const isClient = React.useSyncExternalStore(
    noopSubscribe,
    isClientSnapshot,
    isServerSnapshot
  );
  const runtimeUrl =
    process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL ?? "/api/copilotkit";
  const { accessToken } = useAuth();
  // The runtime route forwards this header to the agent, which verifies the JWT.
  const headers = React.useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

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
