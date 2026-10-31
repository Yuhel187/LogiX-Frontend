"use client";

import { useCallback, useEffect, useState } from "react";
import {
  completeMutationIntent,
  getMutationIntent,
  getOrCreateMutationIntent,
  type MutationIntent,
  type MutationScope,
} from "../utils/mutation-intent";

function storage() {
  if (typeof window === "undefined") {
    throw new Error("Mutation intents are only available in the browser.");
  }
  return window.sessionStorage;
}

export function useMutationIntent(
  scope: MutationScope,
  operation: string
) {
  const tenantId = scope.tenantId;
  const userId = scope.userId;
  const [intent, setIntent] = useState<MutationIntent | null>(null);
  const [ready, setReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setIntent(
          getMutationIntent(storage(), { tenantId, userId }, operation)
        );
        setStorageFailed(false);
      } catch {
        setStorageFailed(true);
      } finally {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [operation, tenantId, userId]);

  const begin = useCallback(
    (input: unknown) => {
      const saved = getOrCreateMutationIntent(
        storage(),
        { tenantId, userId },
        operation,
        input
      );
      setIntent(saved);
      return saved;
    },
    [operation, tenantId, userId]
  );

  const complete = useCallback(
    (requestId: string) => {
      const removed = completeMutationIntent(
        storage(),
        { tenantId, userId },
        operation,
        requestId
      );
      if (removed) setIntent(null);
      return removed;
    },
    [operation, tenantId, userId]
  );

  return { intent, ready, storageFailed, begin, complete };
}
