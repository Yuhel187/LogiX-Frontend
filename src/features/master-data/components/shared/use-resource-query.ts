"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RecordStatus } from "../../schemas/common.schema";
import { DEFAULT_PAGE_SIZE } from "../../types/master-data.types";

export interface ResourceQueryState {
  q: string;
  status: RecordStatus;
  page: number;
  pageSize: number;
}

/**
 * Filters and paging live in the URL per `docs/ARCHITECTURE.md`, so a filtered
 * view is shareable and survives a reload.
 */
export function useResourceQuery(): ResourceQueryState & {
  setQ: (value: string) => void;
  setStatus: (value: RecordStatus) => void;
  setPage: (value: number) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status: RecordStatus =
    searchParams.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const replace = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  return {
    q,
    status,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    // Changing a filter resets paging; staying on page 7 of a new result set is never right.
    setQ: (value) => replace({ q: value || null, page: null }),
    setStatus: (value) => replace({ status: value, page: null }),
    setPage: (value) => replace({ page: value <= 1 ? null : String(value) }),
  };
}
