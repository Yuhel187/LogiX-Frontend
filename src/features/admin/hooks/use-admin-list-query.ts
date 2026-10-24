"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { adminQuerySchema } from "../schemas/admin.schema";
import type { AdminListKind } from "../types/admin.types";

const QUERY_KEYS = ["q", "status", "page", "pageSize"] as const;

export function useAdminListQuery(kind: AdminListKind) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const raw = params.toString();
  const parsed = useMemo(() => {
    const search = new URLSearchParams(raw);
    if (QUERY_KEYS.some((key) => search.getAll(key).length > 1)) return null;
    const result = adminQuerySchema(kind).safeParse(
      Object.fromEntries(
        QUERY_KEYS.flatMap((key) =>
          search.has(key) ? [[key, search.get(key)]] : [],
        ),
      ),
    );
    return result.success ? result.data : null;
  }, [kind, raw]);

  const update = useCallback(
    (changes: Partial<Record<(typeof QUERY_KEYS)[number], string>>) => {
      const next = new URLSearchParams(raw);
      if (!("page" in changes)) next.delete("page");
      for (const [key, value] of Object.entries(changes)) {
        next.delete(key);
        if (value) next.set(key, value);
      }
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
        scroll: false,
      });
    },
    [raw, pathname, router],
  );
  return {
    query: parsed,
    update,
    reset: () => router.replace(pathname, { scroll: false }),
  };
}
