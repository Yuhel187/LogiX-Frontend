"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBoundedRefresh } from "@/lib/api/use-bounded-refresh";

export function useShipmentResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  refreshEnabled = true
) {
  const [result, setResult] = useState<{
    key: string;
    data: T | null;
    error: unknown;
    failed: boolean;
  } | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(key);
  const currentLoad = useRef(load);
  useEffect(() => {
    currentLoad.current = load;
  }, [load]);
  const active = useRef<{ key: string; controller: AbortController } | null>(
    null
  );
  const reload = useCallback(() => {
    if (active.current?.key === key) return;
    const controller = new AbortController();
    active.current?.controller.abort();
    active.current = { key, controller };
    setLoadingKey(key);
    currentLoad
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ key, data, error: null, failed: false });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult((previous) => ({
            key,
            data: previous?.key === key ? previous.data : null,
            error,
            failed: true,
          }));
      })
      .finally(() => {
        if (active.current?.controller === controller) {
          active.current = null;
          setLoadingKey(null);
        }
      });
  }, [key]);
  useEffect(() => {
    // Schedule outside render, including Strict Mode cleanup/replay.
    const timer = window.setTimeout(reload, 0);
    return () => {
      window.clearTimeout(timer);
      active.current?.controller.abort();
      active.current = null;
    };
  }, [reload]);
  useBoundedRefresh(key, reload, refreshEnabled && !result?.failed);
  return {
    data: result?.key === key ? result.data : null,
    error:
      result?.key === key && result.failed ? { cause: result.error } : null,
    loading: loadingKey === key || result?.key !== key,
    reload,
  };
}
