"use client";

import * as React from "react";
import { AlertCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AuditLogItem } from "../types/audit.types";
import { AuditActorTypeBadge, AuditOutcomeBadge } from "./audit-badges";

interface AuditCorrelationTimelineProps {
  items: AuditLogItem[];
  activeLogId: string;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onSelectLog: (item: AuditLogItem) => void;
  formatTimestamp: (iso: string) => string;
}

export function AuditCorrelationTimeline({
  items,
  activeLogId,
  isLoading,
  errorMessage,
  onRetry,
  onSelectLog,
  formatTimestamp,
}: AuditCorrelationTimelineProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-1.5"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          <span>{t("audit.actions.retry")}</span>
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        {t("audit.chain.empty")}
      </div>
    );
  }

  return (
    <ol className="space-y-2.5">
      {items.map((step, index) => {
        const isCurrent = step.id === activeLogId;
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelectLog(step)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isCurrent
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-accent/50",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-semibold text-foreground">
                    {index + 1}
                  </span>
                  <span className="truncate font-mono text-xs font-semibold text-foreground">
                    {step.action}
                  </span>
                </div>
                <AuditOutcomeBadge outcome={step.outcome} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <AuditActorTypeBadge actorType={step.actorType} />
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  {step.sourceService}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3 shrink-0" aria-hidden="true" />
                  <span>{formatTimestamp(step.occurredAt)}</span>
                </span>
                <span className="font-mono text-[11px]">
                  {t("audit.detail.latencyValue", { ms: step.latencyMs })}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
