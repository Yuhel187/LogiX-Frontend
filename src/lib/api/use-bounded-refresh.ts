"use client";

import { useEffect } from "react";
import { LIVE_REFRESH } from "@/lib/config/live-refresh";

/** One bounded polling window per resource; focus/manual refresh remains available afterwards. */
export function useBoundedRefresh(
  resourceKey: string,
  refresh: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    let attempts = 0;
    const focus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(() => {
      if (attempts >= LIVE_REFRESH.maxAttempts) {
        window.clearInterval(timer);
        return;
      }
      if (document.visibilityState === "visible") {
        attempts++;
        refresh();
      }
    }, LIVE_REFRESH.intervalMs);
    window.addEventListener("focus", focus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [resourceKey, refresh, enabled]);
}
