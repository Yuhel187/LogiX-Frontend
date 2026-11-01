"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, PackageX, ShieldAlert, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import type { TriageMetrics } from "../types/dashboard.types";

export interface DashboardTriageAlertProps {
  triage: TriageMetrics;
}

export function DashboardTriageAlert({ triage }: DashboardTriageAlertProps) {
  const { t } = useTranslation();

  const hasIssues =
    triage.pendingStockCount > 0 ||
    triage.deliveryFailedCount > 0 ||
    triage.outOfStockSkuCount > 0 ||
    triage.delayedTripsCount > 0;

  if (!hasIssues) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* 1. Pending Stock Bottleneck Alert */}
      {triage.pendingStockCount > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {t("dashboard.triage.pendingStockAlert", {
                  count: triage.pendingStockCount,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.triage.pendingStockDesc")}
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-500/40 text-xs hover:bg-amber-500/20"
          >
            <Link href="/orders?status=PENDING_STOCK">
              {t("dashboard.triage.viewPendingOrders")}
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* 2. Delivery Failed Alert */}
      {triage.deliveryFailedCount > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-rose-500/20 dark:bg-rose-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <PackageX className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {t("dashboard.triage.deliveryFailedAlert", {
                  count: triage.deliveryFailedCount,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.triage.deliveryFailedDesc")}
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shrink-0 border-rose-500/40 text-xs hover:bg-rose-500/20"
          >
            <Link href="/orders?status=DELIVERY_FAILED">
              {t("dashboard.triage.viewFailedOrders")}
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* 3. Out of stock inventory alert */}
      {triage.outOfStockSkuCount > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-rose-500/20 dark:bg-rose-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {t("dashboard.triage.outOfStockAlert", {
                  count: triage.outOfStockSkuCount,
                })}
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shrink-0 border-rose-500/40 text-xs hover:bg-rose-500/20"
          >
            <Link href="/inventory">
              {t("dashboard.triage.viewInventory")}
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* 4. Delayed or Cancelled Trips Alert */}
      {triage.delayedTripsCount > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-500/20 dark:bg-blue-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Truck className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {t("dashboard.triage.delayedTripsAlert", {
                  count: triage.delayedTripsCount,
                })}
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shrink-0 border-blue-500/40 text-xs hover:bg-blue-500/20"
          >
            <Link href="/transport">
              {t("dashboard.triage.viewTrips")}
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
