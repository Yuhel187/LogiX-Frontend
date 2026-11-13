"use client";

import * as React from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import {
  ActiveTripsTable,
  DashboardHeader,
  DashboardKpiGrid,
  DashboardTriageAlert,
  ForecastPreviewChart,
  LowStockAlertTable,
  OrderTrendChart,
  useDashboardSummary,
} from "@/features/dashboard";

export default function WorkspaceDashboardPage() {
  const { t } = useTranslation();
  const {
    summary,
    warehouses,
    scope,
    isLoading,
    isRefreshing,
    error,
    setWarehouseId,
    setPeriod,
    refresh,
  } = useDashboardSummary();

  return (
    <PageShell container={true} className="space-y-6">
      {/* 1. Header with greeting & context scope bar */}
      <DashboardHeader
        scope={scope}
        warehouses={warehouses}
        isRefreshing={isRefreshing}
        onWarehouseChange={setWarehouseId}
        onPeriodChange={setPeriod}
        onRefresh={refresh}
      />

      {/* Error state */}
      {error && !summary && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="gap-2 text-xs"
          >
            <RotateCw className="h-3.5 w-3.5" />
            {t("dashboard.messages.retry")}
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && !summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-[340px] w-full rounded-xl" />
            <Skeleton className="h-[340px] w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-[280px] w-full rounded-xl" />
            <Skeleton className="h-[280px] w-full rounded-xl" />
          </div>
        </div>
      )}

      {/* Loaded Dashboard Content */}
      {summary && (
        <>
          {/* Tầng 1: Action Triage Alert Strip */}
          <DashboardTriageAlert triage={summary.triage} />

          {/* Tầng 2: 4 Top KPI Stat Cards (clickable to orders, shipments, transport, inventory) */}
          <DashboardKpiGrid kpis={summary.kpis} />

          {/* Tầng 3: Trung tâm Phân tích & AI Dự báo (2 Cột) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <OrderTrendChart data={summary.orderThroughput} />
            <ForecastPreviewChart data={summary.forecast} />
          </div>

          {/* Tầng 4: Bảng Vận hành Trực tiếp (2 Cột) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ActiveTripsTable trips={summary.activeTrips} />
            <LowStockAlertTable items={summary.lowStockItems} />
          </div>
        </>
      )}
    </PageShell>
  );
}

