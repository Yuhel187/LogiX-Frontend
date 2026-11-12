"use client";

import React, { useState } from "react";
import {
  Check,
  X,
  Package,
  Truck,
  Warehouse,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NormalizedApprovalData } from "../lib/parse-approval-data";

export interface UniversalApprovalCardProps {
  data: NormalizedApprovalData;
  onResolve: (decision: { approved: boolean; decision: string; approval_id?: string }) => void;
  onCancel?: () => void;
}

export function UniversalApprovalCard({
  data,
  onResolve,
  onCancel,
}: UniversalApprovalCardProps) {
  const [submitting, setSubmitting] = useState<"APPROVE" | "REJECT" | null>(null);

  const { ui, approval_id } = data;

  const handleApprove = () => {
    setSubmitting("APPROVE");
    onResolve({
      approved: true,
      decision: "APPROVE",
      approval_id,
    });
  };

  const handleReject = () => {
    setSubmitting("REJECT");
    onResolve({
      approved: false,
      decision: "REJECT",
      approval_id,
    });
    onCancel?.();
  };

  const renderIcon = () => {
    const iconSize = "size-3.5";
    switch (ui.icon) {
      case "truck":
        return <Truck className={iconSize} />;
      case "warehouse":
        return <Warehouse className={iconSize} />;
      case "user":
        return <UserCheck className={iconSize} />;
      case "dollar":
        return <DollarSign className={iconSize} />;
      case "alert":
        return <AlertTriangle className={iconSize} />;
      case "package":
        return <Package className={iconSize} />;
      default:
        return <ShieldAlert className={iconSize} />;
    }
  };

  return (
    <Card
      size="sm"
      className={cn(
        "my-2 border-border/80 bg-card text-card-foreground shadow-xs transition-all",
        ui.severity === "destructive" && "border-destructive/40 bg-destructive/5",
        ui.severity === "warning" && "border-amber-500/40 bg-amber-500/5"
      )}
    >
      <CardHeader className="pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg shadow-2xs",
                ui.severity === "destructive"
                  ? "bg-destructive/15 text-destructive"
                  : ui.severity === "warning"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-primary/10 text-primary"
              )}
            >
              {renderIcon()}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xs font-semibold truncate leading-tight text-foreground">
                {ui.title}
              </CardTitle>
              {ui.subtitle && (
                <CardDescription className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                  {ui.subtitle}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] shrink-0 font-medium px-2 py-0.5 rounded-md",
              ui.severity === "destructive"
                ? "border-destructive/30 text-destructive bg-destructive/10"
                : ui.severity === "warning"
                ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                : "border-border/80 text-muted-foreground bg-muted/50"
            )}
          >
            Chờ duyệt
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-0 pb-3">
        {/* Impact Warning Banner if present */}
        {ui.impact_summary && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span className="leading-tight">{ui.impact_summary}</span>
          </div>
        )}

        {/* Dynamic Key-Value Attributes List */}
        {ui.attributes && ui.attributes.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5 text-xs border border-border/40">
            {ui.attributes.map((attr, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-[11px] gap-2"
              >
                <span className="text-muted-foreground shrink-0">{attr.label}</span>
                <div className="flex items-center gap-1.5 min-w-0 justify-end">
                  <span
                    className={cn(
                      "font-medium truncate max-w-[180px]",
                      attr.highlight
                        ? "text-primary font-semibold"
                        : "text-foreground"
                    )}
                  >
                    {attr.value}
                  </span>
                  {attr.badge && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.2 text-[9px] font-bold uppercase shrink-0",
                        attr.badge.variant === "success" &&
                          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        attr.badge.variant === "destructive" &&
                          "bg-destructive/15 text-destructive",
                        attr.badge.variant === "warning" &&
                          "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {attr.badge.text}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Sub-Table (e.g. Lines / Shortages) */}
        {ui.table && ui.table.rows.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-background/50 overflow-hidden text-[11px]">
            {ui.table.title && (
              <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {ui.table.title}
              </div>
            )}
            <div className="max-h-36 overflow-y-auto divide-y divide-border/30">
              {ui.table.rows.map((row, rIdx) => (
                <div
                  key={rIdx}
                  className="flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/20 transition-colors"
                >
                  <span className="font-medium text-foreground truncate max-w-[60%]">
                    {String(row.product || row.name || row.title || `Item #${rIdx + 1}`)}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {row.quantity !== undefined && (
                      <span className="text-muted-foreground text-[10px] font-mono">
                        {String(row.quantity)}
                      </span>
                    )}
                    {row.sufficient !== undefined && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 text-[10px] font-semibold",
                          row.sufficient
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        )}
                      >
                        {row.sufficient ? (
                          <>
                            <CheckCircle2 className="size-2.5" /> Đủ
                          </>
                        ) : (
                          <>
                            <AlertCircle className="size-2.5" /> Thiếu
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-1.5 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={submitting !== null}
          onClick={handleReject}
          className="text-xs h-7.5 px-3 rounded-md"
        >
          {submitting === "REJECT" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <X className="size-3" />
          )}
          <span>Từ chối</span>
        </Button>

        <Button
          size="sm"
          variant={ui.severity === "destructive" ? "destructive" : "default"}
          disabled={submitting !== null}
          onClick={handleApprove}
          className="text-xs h-7.5 px-3.5 rounded-md font-medium"
        >
          {submitting === "APPROVE" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Check className="size-3" />
          )}
          <span>Phê duyệt</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
