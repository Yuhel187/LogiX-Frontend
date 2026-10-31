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

export function ForecastChart({ points }: ForecastChartProps) {
  const data = React.useMemo<ChartDatum[]>(() => {
    return points.map((pt) => ({
      dateLabel: formatShortDate(pt.forecast_date),
      fullDate: pt.forecast_date,
      predicted: Number(pt.predicted_quantity.toFixed(1)),
      trend: Number(pt.trend_component.toFixed(1)),
      lower: Number(pt.lower_bound.toFixed(1)),
      upper: Number(pt.upper_bound.toFixed(1)),
      confidenceBand: [
        Number(pt.lower_bound.toFixed(1)),
        Number(pt.upper_bound.toFixed(1)),
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
                      <span className="text-muted-foreground">Dự báo</span>
                      <span className="font-mono font-semibold text-primary tabular-nums">
                        {row.predicted.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-muted-foreground">Khoảng P80</span>
                      <span className="font-mono text-foreground tabular-nums">
                        {row.lower.toFixed(1)} – {row.upper.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-muted-foreground">Xu hướng</span>
                      <span className="font-mono text-muted-foreground tabular-nums">
                        {row.trend.toFixed(1)}
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
