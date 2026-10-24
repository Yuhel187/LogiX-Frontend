"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBoundedRefresh } from "@/lib/api/use-bounded-refresh";
import { SHIPMENT_RESOURCE_CHANGED } from "../constants/shipment.constants";

export function invalidateShipmentResources() {
  window.dispatchEvent(new Event(SHIPMENT_RESOURCE_CHANGED));
}

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
  const active = useRef<{
    key: string;
    controller: AbortController;
    promise?: Promise<T | void>;
  } | null>(null);
  const reload = useCallback(() => {
    if (active.current?.key === key) return active.current.promise;
    const controller = new AbortController();
    active.current?.controller.abort();
    const request: NonNullable<typeof active.current> = { key, controller };
    active.current = request;
    setLoadingKey(key);
    request.promise = currentLoad
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ key, data, error: null, failed: false });
          return data;
        }
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
    return request.promise;
  }, [key]);
  const accept = useCallback(
    (data: T) => {
      active.current?.controller.abort();
      active.current = null;
      setLoadingKey(null);
      setResult({ key, data, error: null, failed: false });
    },
    [key]
  );
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
  useEffect(() => {
    if (!refreshEnabled) return;
    const refresh = () => {
      active.current?.controller.abort();
      active.current = null;
      void reload();
    };
    window.addEventListener(SHIPMENT_RESOURCE_CHANGED, refresh);
    return () => window.removeEventListener(SHIPMENT_RESOURCE_CHANGED, refresh);
  }, [reload, refreshEnabled]);
  return {
    data: result?.key === key ? result.data : null,
    error:
      result?.key === key && result.failed ? { cause: result.error } : null,
    loading: loadingKey === key || result?.key !== key,
    reload,
    accept,
  };
}
