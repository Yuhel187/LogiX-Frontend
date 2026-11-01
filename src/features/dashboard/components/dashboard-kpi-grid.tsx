"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Box, Package, Truck } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { useTranslation } from "@/lib/i18n";
import type { KpiMetrics } from "../types/dashboard.types";

export interface DashboardKpiGridProps {
  kpis: KpiMetrics;
}

export function DashboardKpiGrid({ kpis }: DashboardKpiGridProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Orders KPI -> /orders */}
      <Link
        href="/orders"
        className="group block rounded-xl transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <StatCard
          title={t("dashboard.kpis.ordersToday.title")}
          value={kpis.ordersToday.total}
          trend={{
            value: `${kpis.ordersToday.percentChangeVsYesterday >= 0 ? "+" : ""}${kpis.ordersToday.percentChangeVsYesterday}%`,
            isPositive: kpis.ordersToday.percentChangeVsYesterday >= 0,
            label: t("dashboard.kpis.ordersToday.vsYesterday"),
          }}
          description={t("dashboard.kpis.ordersToday.confirmed", {
            count: kpis.ordersToday.confirmed,
          })}
          accentColor="emerald"
          icon={Package}
          className="cursor-pointer transition-colors group-hover:border-emerald-500/50"
        />
      </Link>

      {/* 2. Ready to Ship Shipment Pool -> /shipments */}
      <Link
        href="/shipments"
        className="group block rounded-xl transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <StatCard
          title={t("dashboard.kpis.readyToShip.title")}
          value={kpis.shipmentPool.readyToShipCount}
          description={t("dashboard.kpis.readyToShip.description")}
          accentColor="indigo"
          icon={Box}
          className="cursor-pointer transition-colors group-hover:border-indigo-500/50"
        />
      </Link>

      {/* 3. Transport Velocity -> /transport */}
      <Link
        href="/transport"
        className="group block rounded-xl transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <StatCard
          title={t("dashboard.kpis.activeTrips.title")}
          value={kpis.transport.activeTripsCount}
          trend={{
            value: `${kpis.transport.deliverySuccessRate}%`,
            isPositive: true,
            label: t("dashboard.kpis.activeTrips.successRate"),
          }}
          description={t("dashboard.kpis.activeTrips.stopsCompleted", {
            completed: kpis.transport.completedStops,
            total: kpis.transport.totalStops,
          })}
          accentColor="blue"
          icon={Truck}
          className="cursor-pointer transition-colors group-hover:border-blue-500/50"
        />
      </Link>

      {/* 4. Inventory Health -> /inventory */}
      <Link
        href="/inventory"
        className="group block rounded-xl transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <StatCard
          title={t("dashboard.kpis.lowStock.title")}
          value={kpis.inventory.lowStockSkuCount}
          description={t("dashboard.kpis.lowStock.description")}
          accentColor="rose"
          icon={AlertTriangle}
          className="cursor-pointer transition-colors group-hover:border-rose-500/50"
        />
      </Link>
    </div>
  );
}
