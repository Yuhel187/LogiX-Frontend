"use client";

import * as React from "react";
import { RotateCw, Sparkles, Warehouse as WarehouseIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/auth-context";
import type { Warehouse } from "@/features/master-data/schemas/warehouse.schema";
import type { DashboardPeriod, DashboardScope } from "../types/dashboard.types";

export interface DashboardHeaderProps {
  scope: DashboardScope;
  warehouses: Warehouse[];
  isRefreshing: boolean;
  onWarehouseChange: (id: string | "all") => void;
  onPeriodChange: (period: DashboardPeriod) => void;
  onRefresh: () => void;
}

export function DashboardHeader({
  scope,
  warehouses,
  isRefreshing,
  onWarehouseChange,
  onPeriodChange,
  onRefresh,
}: DashboardHeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Compute personalized greeting based on local hour
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12
      ? t("dashboard.greeting.morning")
      : hour < 18
      ? t("dashboard.greeting.afternoon")
      : t("dashboard.greeting.evening");

  const userName = user?.displayName || user?.email?.split("@")[0] || "";
  const greetingHeadline = userName
    ? `${timeGreeting}, ${userName}!`
    : `${timeGreeting}!`;

  return (
    <div className="space-y-1">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
        <Sparkles className="size-3" />
        <span>{greetingHeadline}</span>
      </div>

      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.greeting.subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Warehouse Selector */}
            <div className="flex items-center gap-1.5">
              <Select
                value={scope.warehouseId}
                onValueChange={(val) => onWarehouseChange(val)}
              >
                <SelectTrigger className="h-8 min-w-[160px] text-xs">
                  <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                  <SelectValue placeholder={t("dashboard.filters.allWarehouses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("dashboard.filters.allWarehouses")}
                  </SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-1.5">
              <Select
                value={scope.period}
                onValueChange={(val) => onPeriodChange(val as DashboardPeriod)}
              >
                <SelectTrigger className="h-8 min-w-[120px] text-xs">
                  <SelectValue placeholder={t("dashboard.filters.periods.today")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">
                    {t("dashboard.filters.periods.today")}
                  </SelectItem>
                  <SelectItem value="7d">
                    {t("dashboard.filters.periods.7d")}
                  </SelectItem>
                  <SelectItem value="30d">
                    {t("dashboard.filters.periods.30d")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 gap-1.5 text-xs"
            >
              <RotateCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing
                ? t("dashboard.filters.refreshing")
                : t("dashboard.filters.refresh")}
            </Button>
          </div>
        }
      />
    </div>
  );
}
