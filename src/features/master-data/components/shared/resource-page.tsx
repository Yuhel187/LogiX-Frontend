"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useTranslation } from "@/lib/i18n";
import type { Paginated, RecordStatus } from "../../schemas/common.schema";
import type { MasterDataQueryParams } from "../../types/master-data.types";
import { resolveApiErrorMessage } from "../../utils/error-message";
import { ResourceFilters } from "./resource-filters";
import {
  ResourceTable,
  type ResourceColumn,
  type ResourceRowAction,
} from "./resource-table";
import { useResourceQuery } from "./use-resource-query";

interface ResourcePageProps<T extends { id: string; status: RecordStatus }> {
  title: string;
  description: string;
  searchPlaceholder: string;
  emptyMessage: string;
  createLabel: string;
  columns: ResourceColumn<T>[];
  fetchPage: (params: MasterDataQueryParams) => Promise<Paginated<T>>;
  /** Built once; each action receives its row through `onSelect` and `hidden`. */
  buildActions: (reload: () => void) => ResourceRowAction<T>[];
  /** Rendered once; receives the reload the page owns so writes can refresh it. */
  renderDialogs?: (reload: () => void) => ReactNode;
  onCreate: () => void;
}

export function ResourcePage<T extends { id: string; status: RecordStatus }>({
  title,
  description,
  searchPlaceholder,
  emptyMessage,
  createLabel,
  columns,
  fetchPage,
  buildActions,
  renderDialogs,
  onCreate,
}: ResourcePageProps<T>) {
  const { t } = useTranslation();
  const { q, status, page, pageSize, setQ, setStatus, setPage } =
    useResourceQuery();

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchPage({ q: q || undefined, status, page, pageSize })
      .then((result) => {
        if (cancelled) return;
        setRows(result.items);
        setTotal(result.total);
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(resolveApiErrorMessage(cause));
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchPage, q, status, page, pageSize, reloadToken]);

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="size-4" />
          {createLabel}
        </Button>
      </div>

      <ResourceFilters
        q={q}
        status={status}
        onQChange={setQ}
        onStatusChange={setStatus}
        searchPlaceholder={searchPlaceholder}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <ResourceTable
        rows={rows}
        columns={columns}
        actions={buildActions(reload)}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />

      {total > pageSize ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("masterData.pageOf", {
              page: String(page),
              lastPage: String(lastPage),
              total: String(total),
            })}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={page <= 1}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={page >= lastPage}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page < lastPage) setPage(page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      {renderDialogs?.(reload)}
    </div>
  );
}
