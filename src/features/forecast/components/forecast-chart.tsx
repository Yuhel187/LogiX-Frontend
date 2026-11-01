"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyForecastPoint } from "../types";
import { useTranslation } from "@/lib/i18n";

interface ForecastChartProps {
  points: DailyForecastPoint[];
}

interface ChartDatum {
  dateLabel: string;
  fullDate: string;
  predicted: number;
  trend: number;
  lower: number;
  upper: number;
  confidenceBand: [number, number];
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

function safeNumber(val: unknown, decimals = 1, fallback = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? Number(num.toFixed(decimals)) : fallback;
}

function safeFormat(val: unknown, decimals = 1, fallback = "0.0"): string {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num.toFixed(decimals) : fallback;
}

export function ForecastChart({ points }: ForecastChartProps) {
  const { t } = useTranslation();
  const data = React.useMemo<ChartDatum[]>(() => {
    return points.map((pt) => ({
      dateLabel: formatShortDate(pt.forecast_date),
      fullDate: pt.forecast_date,
      predicted: safeNumber(pt.predicted_quantity),
      trend: safeNumber(pt.trend_component ?? pt.predicted_quantity),
      lower: safeNumber(pt.lower_bound),
      upper: safeNumber(pt.upper_bound),
      confidenceBand: [
        safeNumber(pt.lower_bound),
        safeNumber(pt.upper_bound),
      ],
    }));
  }, [points]);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="dateLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const row = payload[0]?.payload as ChartDatum | undefined;
              if (!row) return null;

              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
                  <div className="mb-1.5 font-mono font-medium text-foreground">
                    {row.fullDate}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-muted-foreground">{t("forecast.chartForecast")}</span>
                      <span className="font-mono font-semibold text-primary tabular-nums">
                        {safeFormat(row.predicted)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-muted-foreground">{t("forecast.chartP80")}</span>
                      <span className="font-mono text-foreground tabular-nums">
                        {safeFormat(row.lower)} – {safeFormat(row.upper)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-muted-foreground">{t("forecast.chartTrend")}</span>
                      <span className="font-mono text-muted-foreground tabular-nums">
                        {safeFormat(row.trend)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="confidenceBand"
            stroke="none"
            fill="var(--primary)"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
            activeDot={{ r: 4.5, fill: "var(--primary)", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
