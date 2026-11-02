"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { listWarehousesApi } from "@/features/master-data/api/warehouses.api";
import type { Warehouse } from "@/features/master-data/schemas/warehouse.schema";
import { fetchDashboardSummaryApi } from "../api/dashboard.api";
import type {
  DashboardPeriod,
  DashboardScope,
  DashboardSummary,
} from "../types/dashboard.types";

export interface UseDashboardSummaryResult {
  summary: DashboardSummary | null;
  warehouses: Warehouse[];
  scope: DashboardScope;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  setWarehouseId: (id: string | "all") => void;
  setPeriod: (period: DashboardPeriod) => void;
  refresh: () => Promise<void>;
}

export function useDashboardSummary(): UseDashboardSummaryResult {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [scope, setScope] = React.useState<DashboardScope>({
    warehouseId: "all",
    period: "today",
  });
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load warehouses once on mount
  React.useEffect(() => {
    let cancelled = false;
    listWarehousesApi({ pageSize: 50 })
      .then((res) => {
        if (!cancelled) setWarehouses(res.items);
      })
      .catch(() => {
        // Soft fail; dropdown will display "All Warehouses"
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Synchronize dashboard summary when scope changes
  React.useEffect(() => {
    let cancelled = false;

    fetchDashboardSummaryApi(scope)
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("dashboard.messages.fetchError"));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scope, t]);

  const setWarehouseId = React.useCallback((id: string | "all") => {
    setScope((prev) => ({ ...prev, warehouseId: id }));
  }, []);

  const setPeriod = React.useCallback((period: DashboardPeriod) => {
    setScope((prev) => ({ ...prev, period }));
  }, []);

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchDashboardSummaryApi(scope);
      setSummary(data);
      setError(null);
      toast.success(t("dashboard.messages.refreshSuccess"));
    } catch {
      setError(t("dashboard.messages.fetchError"));
      toast.error(t("dashboard.messages.fetchError"));
    } finally {
      setIsRefreshing(false);
    }
  }, [scope, t]);

  return {
    summary,
    warehouses,
    scope,
    isLoading,
    isRefreshing,
    error,
    setWarehouseId,
    setPeriod,
    refresh,
  };
}
