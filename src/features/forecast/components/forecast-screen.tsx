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
import {
  FORECAST_PRODUCTS,
  FORECAST_WAREHOUSES,
  type ForecastRunResult,
  type StockoutRisksResponse,
} from "../types";
import { ForecastChart } from "./forecast-chart";

export function ForecastScreen() {
  const [warehouseId, setWarehouseId] = React.useState<string>(
    FORECAST_WAREHOUSES[0].id
  );
  const [productId, setProductId] = React.useState<string>(
    FORECAST_PRODUCTS[0].id
  );
  const [horizonDays, setHorizonDays] = React.useState<number>(7);
  const [reloadCount, setReloadCount] = React.useState<number>(0);

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

    Promise.all([
      triggerForecastRun({
        warehouseId,
        productId,
        horizonDays,
      }),
      fetchStockoutRisks(warehouseId, horizonDays),
    ])
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
              : "Không thể kết nối đến forecast-service.";
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
  }, [requestKey, warehouseId, productId, horizonDays]);

  const handleRecalculate = () => {
    setReloadCount((n) => n + 1);
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Dự báo nhu cầu tồn kho
          </h1>
          <p className="text-sm text-muted-foreground">
            Phân tích chuỗi thời gian theo kho và mặt hàng, đối chiếu sai số thực nghiệm và cảnh báo lượng hàng thiếu hụt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="h-8 w-[220px] bg-background">
              <SelectValue placeholder="Chọn kho hàng" />
            </SelectTrigger>
            <SelectContent position="popper">
              {FORECAST_WAREHOUSES.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  {wh.code} · {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="h-8 w-[240px] bg-background">
              <SelectValue placeholder="Chọn mặt hàng" />
            </SelectTrigger>
            <SelectContent position="popper">
              {FORECAST_PRODUCTS.map((prod) => (
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
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleRecalculate}
            disabled={isLoading}
          >
            {isLoading ? "Đang tính..." : "Tính toán lại"}
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
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 divide-y divide-border rounded-lg border border-border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <div className="text-xs text-muted-foreground">
            Tổng cầu dự báo ({horizonDays} ngày)
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-6 w-24" />
          ) : (
            <div className="mt-1 font-mono text-xl font-semibold text-foreground tabular-nums">
              {forecast ? forecast.total_predicted_7d.toFixed(1) : "-"}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="text-xs text-muted-foreground">
            Biên trên nhu cầu (P80)
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-6 w-24" />
          ) : (
            <div className="mt-1 font-mono text-xl font-semibold text-foreground tabular-nums">
              {forecast ? forecast.total_upper_bound_7d.toFixed(1) : "-"}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="text-xs text-muted-foreground">Tồn kho khả dụng</div>
          {isLoading ? (
            <Skeleton className="mt-2 h-6 w-24" />
          ) : (
            <div className="mt-1 font-mono text-xl font-semibold text-foreground tabular-nums">
              {forecast ? forecast.available_stock.toFixed(1) : "-"}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="text-xs text-muted-foreground">
            Lượng thiếu hụt dự kiến
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
              {forecast ? forecast.shortfall_quantity.toFixed(1) : "-"}
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
                Biểu đồ dự báo nhu cầu theo ngày
              </h2>
              <p className="text-xs text-muted-foreground">
                {forecast
                  ? `${forecast.sku_code} · ${forecast.product_name} (${forecast.warehouse_name})`
                  : isLoading
                    ? "Đang tải chuỗi thời gian..."
                    : "Không có dữ liệu dự báo"}
              </p>
            </div>
            {forecast ? (
              <div className="font-mono text-xs text-muted-foreground">
                Mô hình: {forecast.model_name} · Mẫu huấn luyện:{" "}
                {forecast.observation_count} ngày
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : forecast ? (
            <ForecastChart points={forecast.forecast_points} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              Chưa tải được dữ liệu biểu đồ từ dịch vụ dự báo.
            </div>
          )}
        </div>

        {/* Right: Backtesting Accuracy & Advisory Summary */}
        <div className="flex flex-col gap-5 lg:col-span-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-medium text-foreground">
                Đối chiếu sai số mô hình
              </h2>
              <p className="text-xs text-muted-foreground">
                Đánh giá trên tập kiểm thử (Rolling Origin Holdout)
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phương pháp</TableHead>
                  <TableHead className="text-right">RMSE</TableHead>
                  <TableHead className="text-right">MAE</TableHead>
                  <TableHead className="text-right">MAPE</TableHead>
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
                      Không có dữ liệu đánh giá sai số.
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
                          {m.rmse.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {m.mae.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {m.mape !== null ? `${m.mape.toFixed(2)}%` : "-"}
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
              Thông số chuỗi & Khuyến nghị
            </h2>
            {isLoading ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : !forecast ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Không có thông tin khuyến nghị.
              </p>
            ) : (
              <div className="mt-3 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 border-b border-border/60 pb-3">
                  <div>
                    <span className="text-muted-foreground">Giai đoạn mẫu</span>
                    <div className="mt-0.5 font-mono text-foreground">
                      {forecast.training_start_date} –{" "}
                      {forecast.training_end_date}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Độ tin cậy</span>
                    <div className="mt-0.5 font-mono text-foreground">
                      {Math.round(forecast.confidence_level * 100)}% (Chế độ:{" "}
                      {forecast.used_fallback ? "Dự phòng" : "Tiêu chuẩn"})
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
              Bảng chi tiết dự báo theo ngày
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead className="text-right">Dự báo</TableHead>
                <TableHead className="text-right">Biên dưới</TableHead>
                <TableHead className="text-right">Biên trên</TableHead>
                <TableHead className="text-right">Xu hướng</TableHead>
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
                    Không có dữ liệu dự báo theo ngày.
                  </TableCell>
                </TableRow>
              ) : (
                forecast.forecast_points.map((pt) => (
                  <TableRow key={pt.forecast_date}>
                    <TableCell className="font-mono text-xs">
                      {pt.forecast_date}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium text-foreground tabular-nums">
                      {pt.predicted_quantity.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {pt.lower_bound.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {pt.upper_bound.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {pt.trend_component.toFixed(1)}
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
              Đối chiếu nhu cầu và tồn kho toàn kho
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mặt hàng</TableHead>
                <TableHead className="text-right">Khả dụng</TableHead>
                <TableHead className="text-right">
                  Cầu ({horizonDays}N)
                </TableHead>
                <TableHead className="text-right">Biên trên</TableHead>
                <TableHead className="text-right">Cần nhập thêm</TableHead>
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
                    Không có dữ liệu đối chiếu tồn kho.
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
                        {item.available_stock.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {item.total_predicted_demand.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {item.total_upper_bound_demand.toFixed(1)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-medium tabular-nums ${
                          item.recommended_replenishment > 0
                            ? "text-destructive"
                            : "text-primary"
                        }`}
                      >
                        {item.recommended_replenishment > 0
                          ? `+${item.recommended_replenishment.toFixed(1)}`
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
