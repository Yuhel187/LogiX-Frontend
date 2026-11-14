"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global Navigation Progress Bar
 * Provides instant visual feedback when navigating between routes or tabs.
 * Directly drives DOM styles for 60fps hardware-accelerated animations
 * without triggering unnecessary React re-renders.
 */
export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const barRef = React.useRef<HTMLDivElement | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const progressRef = React.useRef<number>(0);
  const isInitialMount = React.useRef<boolean>(true);

  const start = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    const container = containerRef.current;
    const bar = barRef.current;
    if (!container || !bar) return;

    container.style.opacity = "1";
    progressRef.current = 15;
    bar.style.transition = "width 120ms ease-out, opacity 150ms ease-out";
    bar.style.width = "15%";

    timerRef.current = setInterval(() => {
      if (progressRef.current >= 85) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      const step = Math.max(1, (85 - progressRef.current) * 0.15);
      progressRef.current += step;
      if (barRef.current) {
        barRef.current.style.width = `${progressRef.current}%`;
      }
    }, 120);
  }, []);

  const finish = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    const container = containerRef.current;
    const bar = barRef.current;
    if (!container || !bar) return;

    progressRef.current = 100;
    bar.style.transition = "width 150ms ease-out, opacity 250ms ease-out";
    bar.style.width = "100%";

    hideTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.style.opacity = "0";
      }
      setTimeout(() => {
        if (barRef.current) {
          barRef.current.style.width = "0%";
          progressRef.current = 0;
        }
      }, 250);
    }, 200);
  }, []);

  // When pathname or searchParams change, finish loading if it was running
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    finish();
  }, [pathname, searchParams, finish]);

  // Intercept internal link clicks and custom events
  React.useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore modified clicks (cmd, ctrl, shift, alt) or new tab targets
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.target === "_blank" ||
        event.defaultPrevented
      ) {
        return;
      }

      // Ignore download links, external links, anchor jumps
      if (
        anchor.hasAttribute("download") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        try {
          const url = new URL(anchor.href);
          if (url.origin !== window.location.origin) return;
        } catch {
          return;
        }
      }

      // Ignore hash links on the same page
      if (href.startsWith("#")) return;

      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl || anchor.pathname + anchor.search === currentUrl) {
        return;
      }

      start();
    };

    const handleCustomStart = () => start();
    const handleCustomDone = () => finish();

    window.addEventListener("app:loading:start", handleCustomStart);
    window.addEventListener("app:loading:done", handleCustomDone);
    document.addEventListener("click", handleAnchorClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      window.removeEventListener("app:loading:start", handleCustomStart);
      window.removeEventListener("app:loading:done", handleCustomDone);
      if (timerRef.current) clearInterval(timerRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [start, finish]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ opacity: 0, transition: "opacity 200ms ease" }}
      className="fixed top-0 left-0 right-0 z-[9999] h-0.75 pointer-events-none overflow-hidden bg-transparent"
    >
      <div
        ref={barRef}
        className="h-full bg-primary relative"
        style={{
          width: "0%",
          boxShadow: "0 0 12px var(--primary), 0 0 6px var(--primary)",
        }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30" />
      </div>
    </div>
  );
}

/**
 * Programmatic trigger helper to show/hide the global progress bar
 */
export const globalLoading = {
  start: () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:loading:start"));
    }
  },
  done: () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:loading:done"));
    }
  },
};
