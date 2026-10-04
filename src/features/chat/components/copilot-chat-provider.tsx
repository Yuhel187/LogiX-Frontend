"use client";

import * as React from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";

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

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <CopilotKit runtimeUrl={runtimeUrl} useSingleEndpoint={false}>
      {children}
    </CopilotKit>
  );
}
