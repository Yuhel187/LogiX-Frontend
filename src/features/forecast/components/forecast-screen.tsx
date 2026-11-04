"use client";

import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchStockoutRisks,
  triggerForecastRun,
} from "../api/forecast.api";
import { listWarehousesApi } from "@/features/master-data/api/warehouses.api";
import { listProductsApi } from "@/features/master-data/api/products.api";
import { getBalanceApi } from "@/features/inventory/api/inventory.api";
import {
  FORECAST_PRODUCTS,
  FORECAST_WAREHOUSES,
  type ForecastRunResult,
  type StockoutRisksResponse,
} from "../types";
import { ForecastChart } from "./forecast-chart";
import { useTranslation } from "@/lib/i18n";

function safeFormat(val: unknown, decimals = 1, fallback = "-"): string {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num.toFixed(decimals) : fallback;
}

export function ForecastScreen() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = React.useState<
    Array<{ id: string; code: string; name: string }>
  >(FORECAST_WAREHOUSES);
  const [products, setProducts] = React.useState<
    Array<{ id: string; sku: string; name: string; defaultAvailableStock?: number }>
  >(FORECAST_PRODUCTS);
  const [isLoadingCatalog, setIsLoadingCatalog] = React.useState<boolean>(true);

  const [warehouseId, setWarehouseId] = React.useState<string>(
    FORECAST_WAREHOUSES[0].id
  );
  const [productId, setProductId] = React.useState<string>(
    FORECAST_PRODUCTS[0].id
  );
  const [horizonDays, setHorizonDays] = React.useState<number>(7);
  const [reloadCount, setReloadCount] = React.useState<number>(0);

  // Load actual warehouses and products from backend Master Data
  React.useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setIsLoadingCatalog(true);
      try {
        const [whRes, prodRes] = await Promise.allSettled([
          listWarehousesApi({ pageSize: 100 }),
          listProductsApi({ pageSize: 100 }),
        ]);

        if (cancelled) return;

        if (whRes.status === "fulfilled" && whRes.value.items && whRes.value.items.length > 0) {
          const loadedWh = whRes.value.items.map((w) => ({
            id: w.id,
            code: w.code,
            name: w.name,
          }));
          setWarehouses(loadedWh);
          setWarehouseId(loadedWh[0].id);
        }

        if (prodRes.status === "fulfilled" && prodRes.value.items && prodRes.value.items.length > 0) {
          const loadedProds = prodRes.value.items.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
          }));
          setProducts(loadedProds);
          setProductId(loadedProds[0].id);
        }
      } catch (err) {
        console.warn("Could not load catalog for forecast, using default catalog:", err);
      } finally {
        if (!cancelled) {
          setIsLoadingCatalog(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestKey = `${warehouseId}|${productId}|${horizonDays}|${reloadCount}`;

  // Derived loading state avoids synchronous setState inside effect
  const [result, setResult] = React.useState<{
    key: string;
    forecast: ForecastRunResult | null;
    risks: StockoutRisksResponse | null;
    error: string | null;
  } | null>(null);

  const isLoading = result?.key !== requestKey;
  const forecast = result?.key === requestKey ? result.forecast : null;
  const risks = result?.key === requestKey ? result.risks : null;
  const error = result?.key === requestKey ? result.error : null;

  React.useEffect(() => {
    let cancelled = false;

    const currentWarehouse = warehouses.find((w) => w.id === warehouseId);
    const currentProduct = products.find((p) => p.id === productId);

    async function executeForecast() {
      let availableStock: number | undefined;
      try {
        const balance = await getBalanceApi(warehouseId, productId);
        if (balance && balance.availableQuantity !== undefined) {
          availableStock = Number(balance.availableQuantity);
        }
      } catch {
        // Fall back to product default
      }

      return Promise.all([
        triggerForecastRun({
          warehouseId,
          productId,
          horizonDays,
          warehouseName: currentWarehouse?.name,
          skuCode: currentProduct?.sku,
          productName: currentProduct?.name,
          availableStock,
        }),
        fetchStockoutRisks(warehouseId, horizonDays),
      ]);
    }

    executeForecast()
      .then(([runRes, riskRes]) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            forecast: runRes,
            risks: riskRes,
            error: null,
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : t("forecast.failedConnect");
          setResult({
            key: requestKey,
            forecast: null,
            risks: null,
            error: message,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, warehouseId, productId, horizonDays, warehouses, products, t]);

  const handleRecalculate = () => {
    setReloadCount((n) => n + 1);
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("forecast.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("forecast.description")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={warehouseId} onValueChange={setWarehouseId} disabled={isLoadingCatalog || isLoading}>
            <SelectTrigger className="h-8 w-[220px] bg-background">
              <SelectValue placeholder={t("forecast.selectWarehouse")} />
            </SelectTrigger>
            <SelectContent position="popper">
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  {wh.code} · {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={productId} onValueChange={setProductId} disabled={isLoadingCatalog || isLoading}>
            <SelectTrigger className="h-8 w-[240px] bg-background">
              <SelectValue placeholder={t("forecast.selectProduct")} />
            </SelectTrigger>
            <SelectContent position="popper">
              {products.map((prod) => (
                <SelectItem key={prod.id} value={prod.id}>
                  {prod.sku} · {prod.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(horizonDays)}
            onValueChange={(v) => setHorizonDays(Number(v))}
          >
            <SelectTrigger className="h-8 w-[110px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="7">{t("forecast.horizonDays", { days: 7 })}</SelectItem>
              <SelectItem value="14">{t("forecast.horizonDays", { days: 14 })}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleRecalculate}
            disabled={isLoading}
          >
            {isLoading ? t("forecast.calculating") : t("forecast.recalculate")}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={isLoading}
            >
              {t("forecast.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 divide-y divide-border rounded-lg border border-border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <div className="text-xs text-muted-foreground">
            {t("forecast.totalDemand", { days: horizonDays })}
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-6 w-24" />
          ) : (
            <div className="mt-1 font-mono text-xl font-semibold text-foreground tabular-nums">
              {forecast ? safeFormat(forecast.total_predicted_7d) : "-"}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="text-xs text-muted-foreground">
            {t("forecast.upperDemandP80")}
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-6 w-24" />
          ) : (
            <div className="mt-1 font-mono text-xl font-semibold text-foreground tabular-nums">
              {forecast ? safeFormat(forecast.total_upper_bound_7d) : "-"}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="text-xs text-muted-foreground">{t("forecast.availableStock")}</div>
          {isLoading ? (
            <Skeleton className="mt-2 h-6 w-24" />
          ) : (
            <div className="mt-1 font-mono text-xl font-semibold text-foreground tabular-nums">
              {forecast ? safeFormat(forecast.available_stock) : "-"}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="text-xs text-muted-foreground">
            {t("forecast.expectedShortfall")}
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-6 w-24" />
          ) : (
            <div
              className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
                forecast && forecast.shortfall_quantity > 0
                  ? "text-destructive"
                  : forecast
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              {forecast ? safeFormat(forecast.shortfall_quantity) : "-"}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid: Chart + Model Metrics */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Forecast Chart */}
        <div className="rounded-lg border border-border bg-card p-4 lg:col-span-8">
          <div className="mb-4 flex flex-col justify-between gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                {t("forecast.chartTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {forecast
                  ? `${forecast.sku_code} · ${forecast.product_name} (${forecast.warehouse_name})`
                  : isLoading
                    ? t("forecast.loadingTimeSeries")
                    : t("forecast.noForecastData")}
              </p>
            </div>
            {forecast ? (
              <div className="font-mono text-xs text-muted-foreground">
                {t("forecast.modelMeta", {
                  model: forecast.model_name,
                  count: forecast.observation_count,
                })}
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : forecast ? (
            <ForecastChart points={forecast.forecast_points} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              {t("forecast.chartLoadError")}
            </div>
          )}
        </div>

        {/* Right: Backtesting Accuracy & Advisory Summary */}
        <div className="flex flex-col gap-5 lg:col-span-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-medium text-foreground">
                {t("forecast.errorComparisonTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("forecast.errorComparisonDesc")}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("forecast.colMethod")}</TableHead>
                  <TableHead className="text-right">{t("forecast.colRmse")}</TableHead>
                  <TableHead className="text-right">{t("forecast.colMae")}</TableHead>
                  <TableHead className="text-right">{t("forecast.colMape")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }, (_, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-12" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !forecast || forecast.metrics.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-xs text-muted-foreground"
                    >
                      {t("forecast.noErrorData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  forecast.metrics.map((m) => {
                    const isPrimary = m.method_name === forecast.model_name;
                    return (
                      <TableRow key={m.method_name}>
                        <TableCell
                          className={
                            isPrimary
                              ? "font-medium text-primary"
                              : "text-muted-foreground"
                          }
                        >
                          {m.method_name}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {safeFormat(m.rmse, 2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {safeFormat(m.mae, 2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {m.mape != null ? `${safeFormat(m.mape, 2)}%` : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex-1 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-foreground">
              {t("forecast.paramsAndAdvisory")}
            </h2>
            {isLoading ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : !forecast ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("forecast.noAdvisory")}
              </p>
            ) : (
              <div className="mt-3 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 border-b border-border/60 pb-3">
                  <div>
                    <span className="text-muted-foreground">{t("forecast.samplePeriod")}</span>
                    <div className="mt-0.5 font-mono text-foreground">
                      {forecast.training_start_date} –{" "}
                      {forecast.training_end_date}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("forecast.confidenceLevel")}</span>
                    <div className="mt-0.5 font-mono text-foreground">
                      {t("forecast.confidenceMeta", {
                        percent: Math.round(forecast.confidence_level * 100),
                        mode: forecast.used_fallback
                          ? t("forecast.modeFallback")
                          : t("forecast.modeStandard"),
                      })}
                    </div>
                  </div>
                </div>
                <p className="leading-relaxed text-muted-foreground">
                  {forecast.recommended_action}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Forecast Detail & Warehouse Stockout Risk Tables */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Daily Schedule Table */}
        <div className="rounded-lg border border-border bg-card lg:col-span-6">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">
              {t("forecast.dailyScheduleTitle")}
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("forecast.colDate")}</TableHead>
                <TableHead className="text-right">{t("forecast.colForecast")}</TableHead>
                <TableHead className="text-right">{t("forecast.colLowerBound")}</TableHead>
                <TableHead className="text-right">{t("forecast.colUpperBound")}</TableHead>
                <TableHead className="text-right">{t("forecast.colTrend")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }, (_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !forecast || forecast.forecast_points.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-xs text-muted-foreground"
                  >
                    {t("forecast.noDailyData")}
                  </TableCell>
                </TableRow>
              ) : (
                forecast.forecast_points.map((pt) => (
                  <TableRow key={pt.forecast_date}>
                    <TableCell className="font-mono text-xs">
                      {pt.forecast_date}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium text-foreground tabular-nums">
                      {safeFormat(pt.predicted_quantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {safeFormat(pt.lower_bound)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {safeFormat(pt.upper_bound)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {safeFormat(pt.trend_component ?? pt.predicted_quantity)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Warehouse Stockout Risk Table */}
        <div className="rounded-lg border border-border bg-card lg:col-span-6">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">
              {t("forecast.warehouseStockoutTitle")}
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("forecast.colProduct")}</TableHead>
                <TableHead className="text-right">{t("forecast.colAvailable")}</TableHead>
                <TableHead className="text-right">
                  {t("forecast.colDemandDays", { days: horizonDays })}
                </TableHead>
                <TableHead className="text-right">{t("forecast.colUpperBound")}</TableHead>
                <TableHead className="text-right">{t("forecast.colReplenishment")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 2 }, (_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !risks || risks.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-xs text-muted-foreground"
                  >
                    {t("forecast.noStockoutData")}
                  </TableCell>
                </TableRow>
              ) : (
                risks.items.map((item) => {
                  const isSelected = item.product_id === productId;
                  return (
                    <TableRow
                      key={item.product_id}
                      className={`cursor-pointer ${
                        isSelected ? "bg-muted/40" : ""
                      }`}
                      onClick={() => setProductId(item.product_id)}
                    >
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">
                          {item.product_name}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {item.sku_code}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {safeFormat(item.available_stock)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {safeFormat(item.total_predicted_demand)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {safeFormat(item.total_upper_bound_demand)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-medium tabular-nums ${
                          item.recommended_replenishment > 0
                            ? "text-destructive"
                            : "text-primary"
                        }`}
                      >
                        {item.recommended_replenishment > 0
                          ? `+${safeFormat(item.recommended_replenishment)}`
                          : "0.0"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
