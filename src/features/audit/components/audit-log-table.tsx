"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Eye, Link2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import type { AuditLogItem, AuditLogsPageMeta } from "../types/audit.types";
import { AuditActorTypeBadge, AuditOutcomeBadge } from "./audit-badges";

interface AuditLogTableProps {
  items: AuditLogItem[];
  meta: AuditLogsPageMeta;
  isLoading: boolean;
  onSelectItem: (item: AuditLogItem) => void;
  onFilterByCorrelation: (correlationId: string) => void;
  onPageChange: (page: number) => void;
  formatTimestamp: (iso: string) => string;
}

function shortUuid(value: string | null): string {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

export function AuditLogTable({
  items,
  meta,
  isLoading,
  onSelectItem,
  onFilterByCorrelation,
  onPageChange,
  formatTimestamp,
}: AuditLogTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-border bg-card overflow-hidden"
        aria-busy="true"
      >
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3.5 w-80 max-w-full" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-14 text-center">
        <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ScrollText className="size-5" aria-hidden="true" />
        </div>
        <h2 className="mt-3 text-base font-semibold text-foreground">
          {t("audit.empty.title")}
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {t("audit.empty.description")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">{t("audit.table.occurredAt")}</th>
              <th className="px-4 py-3">{t("audit.table.actor")}</th>
              <th className="px-4 py-3">{t("audit.table.action")}</th>
              <th className="px-4 py-3">{t("audit.table.entity")}</th>
              <th className="px-4 py-3">{t("audit.table.service")}</th>
              <th className="px-4 py-3">{t("audit.table.outcome")}</th>
              <th className="px-4 py-3">{t("audit.table.correlation")}</th>
              <th className="px-4 py-3 text-right">{t("audit.table.detail")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr
                key={item.id}
                className="transition-colors hover:bg-muted/30"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-xs font-medium text-foreground">
                    {formatTimestamp(item.occurredAt)}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {t("audit.detail.latencyValue", { ms: item.latencyMs })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <AuditActorTypeBadge actorType={item.actorType} />
                    <span
                      className="font-mono text-[11px] text-muted-foreground"
                      title={item.actorId ?? undefined}
                    >
                      {item.actorId
                        ? shortUuid(item.actorId)
                        : t("audit.common.systemActor")}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 max-w-[220px]">
                  <span className="block truncate font-mono text-xs font-medium text-foreground" title={item.action}>
                    {item.action}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-xs font-medium text-foreground">
                    {item.entityType}
                  </div>
                  <div
                    className="font-mono text-[11px] text-muted-foreground"
                    title={item.entityId ?? undefined}
                  >
                    {shortUuid(item.entityId)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                    {item.sourceService}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <AuditOutcomeBadge outcome={item.outcome} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onFilterByCorrelation(item.correlationId)}
                    className="h-7 gap-1 px-2 font-mono text-xs text-muted-foreground hover:text-foreground"
                    title={item.correlationId}
                  >
                    <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{shortUuid(item.correlationId)}</span>
                  </Button>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectItem(item)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Eye className="size-3.5" aria-hidden="true" />
                    <span>{t("audit.actions.inspect")}</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked list */}
      <ul className="divide-y divide-border md:hidden">
        {items.map((item) => (
          <li key={item.id} className="p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AuditOutcomeBadge outcome={item.outcome} />
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(item.occurredAt)}
              </span>
            </div>
            <div className="font-mono text-xs font-semibold text-foreground break-all">
              {item.action}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <AuditActorTypeBadge actorType={item.actorType} />
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {item.sourceService}
              </span>
              <span>{item.entityType}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onFilterByCorrelation(item.correlationId)}
                className="h-7 gap-1 px-2 font-mono text-xs text-muted-foreground"
              >
                <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{shortUuid(item.correlationId)}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectItem(item)}
                className="h-8 gap-1.5 text-xs"
              >
                <Eye className="size-3.5" aria-hidden="true" />
                <span>{t("audit.actions.inspect")}</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span>
          {t("audit.pagination.summary", {
            total: meta.total,
            page: meta.page,
            totalPages: Math.max(1, meta.totalPages),
          })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
            className="h-8 gap-1 px-2.5 text-xs"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            <span>{t("audit.pagination.previous")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={meta.totalPages === 0 || meta.page >= meta.totalPages}
            onClick={() => onPageChange(meta.page + 1)}
            className="h-8 gap-1 px-2.5 text-xs"
          >
            <span>{t("audit.pagination.next")}</span>
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
