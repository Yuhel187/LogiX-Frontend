"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { listAuditLogsApi } from "../api/audit.api";
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_DEFAULT_LIMIT,
  AUDIT_DEFAULT_PAGE,
  AUDIT_OUTCOMES,
} from "../constants/audit-permissions";
import type {
  AuditActorType,
  AuditFilterParams,
  AuditLogItem,
  AuditLogsPageMeta,
  AuditOutcome,
} from "../types/audit.types";
import { AuditDetailSheet } from "./audit-detail-sheet";
import { AuditFilterBar } from "./audit-filter-bar";
import { AuditLogTable } from "./audit-log-table";

function parseFiltersFromSearchParams(
  searchParams: URLSearchParams,
): AuditFilterParams {
  const rawOutcome = searchParams.get("outcome") ?? undefined;
  const outcome = AUDIT_OUTCOMES.includes(rawOutcome as AuditOutcome)
    ? (rawOutcome as AuditOutcome)
    : undefined;

  const rawActorType = searchParams.get("actorType") ?? undefined;
  const actorType = AUDIT_ACTOR_TYPES.includes(rawActorType as AuditActorType)
    ? (rawActorType as AuditActorType)
    : undefined;

  const parsedPage = Number(searchParams.get("page") ?? AUDIT_DEFAULT_PAGE);
  const page =
    Number.isInteger(parsedPage) && parsedPage >= 1
      ? parsedPage
      : AUDIT_DEFAULT_PAGE;

  return {
    action: searchParams.get("action") || undefined,
    outcome,
    actorType,
    sourceService: searchParams.get("sourceService") || undefined,
    actorId: searchParams.get("actorId") || undefined,
    entityType: searchParams.get("entityType") || undefined,
    entityId: searchParams.get("entityId") || undefined,
    correlationId: searchParams.get("correlationId") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    page,
    limit: AUDIT_DEFAULT_LIMIT,
  };
}

function buildSearchParamsFromFilters(
  filters: AuditFilterParams,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.outcome) params.set("outcome", filters.outcome);
  if (filters.actorType) params.set("actorType", filters.actorType);
  if (filters.sourceService) params.set("sourceService", filters.sourceService);
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId) params.set("entityId", filters.entityId);
  if (filters.correlationId) params.set("correlationId", filters.correlationId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export function AuditExplorerScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = React.useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );
  const filterKey = searchParams.toString();

  const [reloadTick, setReloadTick] = React.useState(0);
  const requestKey = `${filterKey}#${reloadTick}`;

  const [fetchState, setFetchState] = React.useState<{
    resolvedKey: string;
    items: AuditLogItem[];
    meta: AuditLogsPageMeta;
    errorMessage: string | null;
  }>({
    resolvedKey: "",
    items: [],
    meta: {
      page: AUDIT_DEFAULT_PAGE,
      limit: AUDIT_DEFAULT_LIMIT,
      total: 0,
      totalPages: 0,
    },
    errorMessage: null,
  });

  const isLoading = fetchState.resolvedKey !== requestKey;
  const items = fetchState.items;
  const meta = fetchState.meta;
  const errorMessage = isLoading ? null : fetchState.errorMessage;

  const [selectedItem, setSelectedItem] = React.useState<AuditLogItem | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = React.useState(false);

  const formatTimestamp = React.useCallback(
    (iso: string) => {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(date);
    },
    [locale],
  );

  const updateUrlFilters = React.useCallback(
    (next: AuditFilterParams) => {
      const nextParams = buildSearchParamsFromFilters(next);
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  React.useEffect(() => {
    const controller = new AbortController();

    listAuditLogsApi(filters, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setFetchState({
          resolvedKey: requestKey,
          items: response.items,
          meta: response.meta,
          errorMessage: null,
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : t("audit.errors.loadFailed");
        setFetchState((prev) => ({
          ...prev,
          resolvedKey: requestKey,
          errorMessage: message,
        }));
      });

    return () => controller.abort();
  }, [filters, requestKey, t]);

  const handleFilterByCorrelation = React.useCallback(
    (correlationId: string) => {
      updateUrlFilters({
        ...filters,
        correlationId,
        page: 1,
      });
    },
    [filters, updateUrlFilters],
  );

  const handlePageChange = React.useCallback(
    (page: number) => {
      updateUrlFilters({
        ...filters,
        page,
      });
    },
    [filters, updateUrlFilters],
  );

  const handleResetFilters = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
              <ShieldCheck className="size-4.5" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl break-words min-w-0">
              {t("audit.pageTitle")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("audit.pageDescription")}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setReloadTick((n) => n + 1)}
          disabled={isLoading}
          className="gap-1.5 active:scale-[0.99] disabled:opacity-50"
        >
          <RefreshCw
            className={isLoading ? "size-3.5 motion-safe:animate-spin" : "size-3.5"}
            aria-hidden="true"
          />
          <span>{t("audit.actions.refresh")}</span>
        </Button>
      </header>

      <AuditFilterBar
        key={filterKey}
        filters={filters}
        onApply={updateUrlFilters}
        onReset={handleResetFilters}
        disabled={isLoading}
      />

      {errorMessage ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <div className="flex items-start gap-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReloadTick((n) => n + 1)}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            <span>{t("audit.actions.retry")}</span>
          </Button>
        </div>
      ) : (
        <AuditLogTable
          items={items}
          meta={meta}
          isLoading={isLoading}
          onSelectItem={(item) => {
            setSelectedItem(item);
            setDetailOpen(true);
          }}
          onFilterByCorrelation={handleFilterByCorrelation}
          onPageChange={handlePageChange}
          formatTimestamp={formatTimestamp}
        />
      )}

      <AuditDetailSheet
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSelectItem={(item) => setSelectedItem(item)}
        onFilterByCorrelation={handleFilterByCorrelation}
        formatTimestamp={formatTimestamp}
      />
    </div>
  );
}
