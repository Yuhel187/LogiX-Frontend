"use client";

import * as React from "react";
import { Check, Copy, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n";
import { getAuditCorrelationChainApi } from "../api/audit.api";
import type { AuditLogItem } from "../types/audit.types";
import { AuditActorTypeBadge, AuditOutcomeBadge } from "./audit-badges";
import { AuditCorrelationTimeline } from "./audit-correlation-timeline";
import { AuditDiffViewer } from "./audit-diff-viewer";

interface AuditDetailSheetProps {
  item: AuditLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectItem: (item: AuditLogItem) => void;
  onFilterByCorrelation: (correlationId: string) => void;
  formatTimestamp: (iso: string) => string;
}

export function AuditDetailSheet({
  item,
  open,
  onOpenChange,
  onSelectItem,
  onFilterByCorrelation,
  formatTimestamp,
}: AuditDetailSheetProps) {
  const { t } = useTranslation();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [chainReloadTick, setChainReloadTick] = React.useState(0);
  const [chainState, setChainState] = React.useState<{
    resolvedKey: string;
    items: AuditLogItem[];
    error: string | null;
  }>({
    resolvedKey: "",
    items: [],
    error: null,
  });

  const correlationId = item?.correlationId ?? "";
  const chainRequestKey =
    open && correlationId ? `${correlationId}#${chainReloadTick}` : "";
  const chainLoading =
    Boolean(chainRequestKey) && chainState.resolvedKey !== chainRequestKey;
  const chainItems =
    Boolean(chainRequestKey) && chainState.resolvedKey === chainRequestKey
      ? chainState.items
      : [];
  const chainError =
    Boolean(chainRequestKey) && chainState.resolvedKey === chainRequestKey
      ? chainState.error
      : null;

  React.useEffect(() => {
    if (!chainRequestKey || !correlationId) {
      return;
    }

    const controller = new AbortController();

    getAuditCorrelationChainApi(correlationId, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setChainState({
          resolvedKey: chainRequestKey,
          items: res.items,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : t("audit.errors.loadChainFailed");
        setChainState({
          resolvedKey: chainRequestKey,
          items: [],
          error: message,
        });
      });

    return () => controller.abort();
  }, [chainRequestKey, correlationId, t]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl sm:max-w-3xl max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
        {item && (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left space-y-2">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <AuditOutcomeBadge outcome={item.outcome} />
                <AuditActorTypeBadge actorType={item.actorType} />
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                  {item.sourceService}
                </span>
              </div>
              <DialogTitle className="font-mono text-base break-all">
                {item.action}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("audit.detail.subtitle")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">
                    {t("audit.detail.tabs.overview")}
                  </TabsTrigger>
                  <TabsTrigger value="diff">
                    {t("audit.detail.tabs.diff")}
                  </TabsTrigger>
                  <TabsTrigger value="chain">
                    {t("audit.detail.tabs.chain", {
                      count: chainItems.length,
                    })}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {t("audit.detail.occurredAt")}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-foreground">
                        {formatTimestamp(item.occurredAt)}
                      </dd>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {t("audit.detail.ingestedAt")}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-foreground">
                        {formatTimestamp(item.ingestedAt)}
                      </dd>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {t("audit.detail.processingLatency")}
                      </dt>
                      <dd className="mt-1 font-mono text-sm font-semibold text-foreground">
                        {t("audit.detail.latencyValue", { ms: item.latencyMs })}
                      </dd>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {t("audit.detail.entity")}
                      </dt>
                      <dd className="mt-1 space-y-0.5">
                        <div className="text-sm font-medium text-foreground">
                          {item.entityType}
                        </div>
                        <div className="break-all font-mono text-xs text-muted-foreground">
                          {item.entityId ?? t("audit.common.empty")}
                        </div>
                      </dd>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {t("audit.detail.actorId")}
                      </dt>
                      <dd className="mt-1 break-all font-mono text-xs text-foreground">
                        {item.actorId ?? t("audit.common.systemActor")}
                      </dd>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {t("audit.detail.sourceEventId")}
                      </dt>
                      <dd className="mt-1 break-all font-mono text-xs text-foreground">
                        {item.sourceEventId ?? t("audit.common.empty")}
                      </dd>
                    </div>
                  </dl>

                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("audit.detail.correlationId")}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] disabled:opacity-50"
                          onClick={() =>
                            handleCopy("correlationId", item.correlationId)
                          }
                        >
                          {copiedKey === "correlationId" ? (
                            <Check className="size-3.5" aria-hidden="true" />
                          ) : (
                            <Copy className="size-3.5" aria-hidden="true" />
                          )}
                          <span>
                            {copiedKey === "correlationId"
                              ? t("audit.actions.copied")
                              : t("audit.actions.copy")}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] disabled:opacity-50"
                          onClick={() => {
                            onFilterByCorrelation(item.correlationId);
                            onOpenChange(false);
                          }}
                        >
                          <Filter className="size-3.5" aria-hidden="true" />
                          <span>{t("audit.actions.filterByCorrelation")}</span>
                        </Button>
                      </div>
                    </div>
                    <p className="break-all font-mono text-xs text-foreground">
                      {item.correlationId}
                    </p>
                    {item.causationId && (
                      <div className="border-t border-border pt-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("audit.detail.causationId")}
                        </span>
                        <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
                          {item.causationId}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="diff">
                  <AuditDiffViewer
                    beforeData={item.beforeData}
                    afterData={item.afterData}
                    metadata={item.metadata}
                  />
                </TabsContent>

                <TabsContent value="chain" className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {t("audit.chain.description")}
                  </p>
                  <AuditCorrelationTimeline
                    items={chainItems}
                    activeLogId={item.id}
                    isLoading={chainLoading}
                    errorMessage={chainError}
                    onRetry={() => setChainReloadTick((n) => n + 1)}
                    onSelectLog={onSelectItem}
                    formatTimestamp={formatTimestamp}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
