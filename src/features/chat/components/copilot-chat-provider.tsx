"use client";

import * as React from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { useAuth } from "@/lib/auth";
<<<<<<< HEAD
import { useAuth } from "@/lib/auth";
=======
>>>>>>> a59046e7eb14ab51c0d02668f50907f479be0972

export interface CopilotChatProviderProps {
  children: React.ReactNode;
}

const isClientSnapshot = () => true;
const isServerSnapshot = () => false;
const noopSubscribe = () => () => { };

export function CopilotChatProvider({ children }: CopilotChatProviderProps) {
  const { accessToken } = useAuth();
  const isClient = React.useSyncExternalStore(
    noopSubscribe,
    isClientSnapshot,
    isServerSnapshot
  );
  const runtimeUrl =
    process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL ?? "/api/copilotkit";
<<<<<<< HEAD
  // Follows token refreshes so the agent never receives an expired token.
  const headers = React.useMemo(() => {
    const result: Record<string, string> = {};
    if (accessToken) result.Authorization = `Bearer ${accessToken}`;
    return result;
  }, [accessToken]);
=======
  const { accessToken } = useAuth();
  // The runtime route forwards this header to the agent, which verifies the JWT.
  const headers = React.useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );
>>>>>>> a59046e7eb14ab51c0d02668f50907f479be0972

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <CopilotKit
      runtimeUrl={runtimeUrl}
      headers={headers}
      useSingleEndpoint={false}
    >
<<<<<<< HEAD
      <CopilotKit
        runtimeUrl={runtimeUrl}
        headers={headers}
        useSingleEndpoint={false}
      >
        {children}
      </CopilotKit>
      );
=======
      {children}
    </CopilotKit>
  );
>>>>>>> a59046e7eb14ab51c0d02668f50907f479be0972
}
