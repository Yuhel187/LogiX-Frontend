"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ORDER_STATUSES,
  type ListOrdersParams,
  type OrderStatus,
} from "../schemas/order.schema";
import { ORDER_LIST_PAGE_SIZE } from "../constants/order.constants";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface OrderListFilters {
  q: string;
  statuses: OrderStatus[];
  customerId: string;
  warehouseId: string;
  /** Calendar dates (YYYY-MM-DD) in the user's local time zone. */
  createdFrom: string;
  createdTo: string;
  page: number;
}

type FilterChanges = Partial<Omit<OrderListFilters, "page">>;

function parseStatuses(raw: string | null): OrderStatus[] {
  if (!raw) return [];
  const allowed = new Set<string>(ORDER_STATUSES);
  return raw
    .split(",")
    .filter((value): value is OrderStatus => allowed.has(value));
}

function parseDate(raw: string | null): string {
  return raw && DATE_ONLY_PATTERN.test(raw) ? raw : "";
}

/** Local start/end of day as full ISO instants, matching the backend's strict ISO 8601 contract. */
function startOfLocalDay(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function endOfLocalDay(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

export function toListOrdersParams(
  filters: OrderListFilters
): ListOrdersParams {
  return {
    q: filters.q || undefined,
    statuses: filters.statuses,
    customerId: filters.customerId || undefined,
    warehouseId: filters.warehouseId || undefined,
    createdFrom: filters.createdFrom
      ? startOfLocalDay(filters.createdFrom)
      : undefined,
    createdTo: filters.createdTo ? endOfLocalDay(filters.createdTo) : undefined,
    page: filters.page,
    pageSize: ORDER_LIST_PAGE_SIZE,
  };
}

/**
 * Filters and paging live in the URL so a filtered order list is shareable
 * and survives reloads/back navigation.
 */
export function useOrderListQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<OrderListFilters>(
    () => ({
      q: searchParams.get("q") ?? "",
      statuses: parseStatuses(searchParams.get("status")),
      customerId: searchParams.get("customerId") ?? "",
      warehouseId: searchParams.get("warehouseId") ?? "",
      createdFrom: parseDate(searchParams.get("createdFrom")),
      createdTo: parseDate(searchParams.get("createdTo")),
      page: Math.max(1, Number(searchParams.get("page") ?? "1") || 1),
    }),
    [searchParams]
  );

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

  // Changing any filter resets paging; staying on page 7 of a new result set is never right.
  const setFilters = useCallback(
    (changes: FilterChanges) => {
      const encoded: Record<string, string | null> = { page: null };
      for (const [key, value] of Object.entries(changes)) {
        encoded[key === "statuses" ? "status" : key] = Array.isArray(value)
          ? value.join(",")
          : (value ?? null);
      }
      replace(encoded);
    },
    [replace]
  );

  const setPage = useCallback(
    (page: number) => replace({ page: page <= 1 ? null : String(page) }),
    [replace]
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const hasActiveFilters =
    filters.q !== "" ||
    filters.statuses.length > 0 ||
    filters.customerId !== "" ||
    filters.warehouseId !== "" ||
    filters.createdFrom !== "" ||
    filters.createdTo !== "";

  return { filters, setFilters, setPage, resetFilters, hasActiveFilters };
}
