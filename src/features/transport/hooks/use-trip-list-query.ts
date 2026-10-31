"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  parseTripListQuery,
  TRIP_LIST_QUERY_KEYS,
} from "../utils/trip-list-query";

export function useTripListQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawQuery = searchParams.toString();
  const state = useMemo(
    () => parseTripListQuery(new URLSearchParams(rawQuery)),
    [rawQuery]
  );
  const canonical = new URLSearchParams();
  if (state.warehouseId) canonical.set("warehouseId", state.warehouseId);
  if (state.status) canonical.set("status", state.status);
  if (state.vehicleId) canonical.set("vehicleId", state.vehicleId);
  if (state.driverId) canonical.set("driverId", state.driverId);
  if (state.plannedStartFrom)
    canonical.set("plannedStartFrom", state.plannedStartFrom);
  if (state.plannedStartTo) canonical.set("plannedStartTo", state.plannedStartTo);
  if (state.search.trim()) canonical.set("search", state.search.trim());
  if (state.page > 1) canonical.set("page", String(state.page));
  const canonicalQuery = canonical.toString();

  useEffect(() => {
    if (state.invalid || canonicalQuery !== rawQuery) {
      router.replace(
        canonicalQuery ? `${pathname}?${canonicalQuery}` : pathname,
        { scroll: false }
      );
    }
  }, [canonicalQuery, pathname, rawQuery, router, state.invalid]);

  const update = (changes: Partial<Record<(typeof TRIP_LIST_QUERY_KEYS)[number], string>>) => {
    const next = new URLSearchParams(canonicalQuery);
    if (!("page" in changes)) next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(next.size ? `${pathname}?${next}` : pathname, {
      scroll: false,
    });
  };

  return {
    ...state,
    update,
    reset: () => router.push(pathname, { scroll: false }),
  };
}
