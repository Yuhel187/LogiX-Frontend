"use client";

import * as React from "react";
import { BrainCircuit, Sparkles } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslation } from "@/lib/i18n";
import type { SkuForecastData } from "../types/dashboard.types";

export interface ForecastPreviewChartProps {
  data: SkuForecastData;
}

export function ForecastPreviewChart({ data }: ForecastPreviewChartProps) {
  const { t } = useTranslation();

  const chartConfig = React.useMemo<ChartConfig>(
    () => ({
      actual: {
        label: t("dashboard.charts.forecast.actual"),
        color: "oklch(0.5 0.05 145)", // Slate / Muted
      },
      forecast: {
        label: t("dashboard.charts.forecast.forecast"),
        color: "oklch(0.6 0.16 145)", // Logistics Emerald Green
      },
      upperBound: {
        label: t("dashboard.charts.forecast.confidenceBand"),
        color: "oklch(0.6 0.16 145)", // Band
      },
    }),
    [t]
  );

  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-xs">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              {t("dashboard.charts.forecast.title")}
            </CardTitle>
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400 text-[11px] gap-1"
            >
              <Sparkles className="h-3 w-3" />
              {t("dashboard.charts.forecast.badge")}
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            {data.productName} ({data.skuCode}) — {t("dashboard.charts.forecast.description")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {data.status === "INSUFFICIENT_DATA" ? (
          <div className="flex h-[270px] w-full flex-col items-center justify-center gap-3 text-center p-6 border border-dashed rounded-lg border-border/60">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div className="max-w-sm space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {t("dashboard.charts.forecast.degradedTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.charts.forecast.degradedDesc")}
              </p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[270px] w-full">
            <ComposedChart
              data={data.points}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border/40"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-[11px] fill-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-[11px] fill-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />

              {/* 80% Confidence Interval Band */}
              <Area
                type="monotone"
                dataKey="upperBound"
                fill="var(--color-forecast)"
                fillOpacity={0.12}
                stroke="none"
              />

              {/* Historical actual observation line */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--color-actual)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-actual)" }}
              />

              {/* Prophet future forecasted line (dashed) */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="var(--color-forecast)"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 3.5, fill: "var(--color-forecast)" }}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
