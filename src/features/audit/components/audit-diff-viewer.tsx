"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AUDIT_REDACTED_MARKER } from "../constants/audit-permissions";
import { computeAuditDiffEntries } from "../types/audit.types";

interface AuditDiffViewerProps {
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
}

function formatCellValue(value: unknown, emptyLabel: string): React.ReactNode {
  if (value === undefined) {
    return <span className="text-muted-foreground">{emptyLabel}</span>;
  }
  if (value === null) {
    return <span className="text-xs text-muted-foreground">null</span>;
  }
  if (value === AUDIT_REDACTED_MARKER) {
    return (
      <Badge variant="outline" className="gap-1 font-mono text-xs text-muted-foreground">
        <Lock className="size-3 shrink-0" aria-hidden="true" />
        <span>{AUDIT_REDACTED_MARKER}</span>
      </Badge>
    );
  }
  if (typeof value === "object") {
    return (
      <pre className="whitespace-pre-wrap break-all font-mono text-xs text-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return (
    <span className="break-all font-mono text-xs text-foreground">
      {String(value)}
    </span>
  );
}

export function AuditDiffViewer({
  beforeData,
  afterData,
  metadata,
}: AuditDiffViewerProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = React.useState<"diff" | "json">("diff");

  const entries = React.useMemo(
    () => computeAuditDiffEntries(beforeData, afterData),
    [beforeData, afterData],
  );

  const hasDiffData = entries.length > 0;
  const hasMetadata = Object.keys(metadata).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {t("audit.diff.title")}
        </h3>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
          <Button
            type="button"
            variant={viewMode === "diff" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("diff")}
          >
            {t("audit.diff.tableMode")}
          </Button>
          <Button
            type="button"
            variant={viewMode === "json" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("json")}
          >
            {t("audit.diff.jsonMode")}
          </Button>
        </div>
      </div>

      {!hasDiffData ? (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          {t("audit.diff.noChanges")}
        </div>
      ) : viewMode === "diff" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">{t("audit.diff.field")}</th>
                <th className="px-3 py-2">{t("audit.diff.before")}</th>
                <th className="px-3 py-2">{t("audit.diff.after")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr
                  key={entry.path}
                  className={cn(
                    "align-top",
                    entry.changeType === "added" &&
                      "bg-emerald-500/5",
                    entry.changeType === "removed" &&
                      "bg-destructive/5",
                    entry.changeType === "changed" &&
                      "bg-amber-500/5",
                  )}
                >
                  <td className="px-3 py-2 font-mono text-xs font-medium text-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{entry.path}</span>
                      {entry.changeType !== "unchanged" && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px] font-medium"
                        >
                          {t(`audit.diff.changeTypes.${entry.changeType}`)}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 max-w-[220px]">
                    {formatCellValue(entry.beforeValue, t("audit.common.empty"))}
                  </td>
                  <td className="px-3 py-2 max-w-[220px]">
                    {formatCellValue(entry.afterValue, t("audit.common.empty"))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("audit.diff.before")}
            </p>
            <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
              {beforeData ? JSON.stringify(beforeData, null, 2) : "null"}
            </pre>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("audit.diff.after")}
            </p>
            <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
              {afterData ? JSON.stringify(afterData, null, 2) : "null"}
            </pre>
          </div>
        </div>
      )}

      {hasMetadata && (
        <div className="space-y-1.5 pt-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            {t("audit.diff.metadata")}
          </h4>
          <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
