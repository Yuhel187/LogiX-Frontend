"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
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
import type { OrderFlowPoint } from "../types/dashboard.types";

export interface OrderTrendChartProps {
  data: OrderFlowPoint[];
}

export function OrderTrendChart({ data }: OrderTrendChartProps) {
  const { t } = useTranslation();

  const chartConfig = React.useMemo<ChartConfig>(
    () => ({
      created: {
        label: t("dashboard.charts.orderTrend.created"),
        color: "oklch(0.6 0.16 145)", // Logistics Emerald Green
      },
      completed: {
        label: t("dashboard.charts.orderTrend.completed"),
        color: "oklch(0.6 0.18 240)", // Indigo / Blue
      },
      cancelled: {
        label: t("dashboard.charts.orderTrend.cancelled"),
        color: "oklch(0.6 0.22 25)", // Rose / Red
      },
    }),
    [t]
  );

  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">
          {t("dashboard.charts.orderTrend.title")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {t("dashboard.charts.orderTrend.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer config={chartConfig} className="h-[270px] w-full">
          <BarChart
            data={data}
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
              allowDecimals={false}
              className="text-[11px] fill-muted-foreground"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="created"
              fill="var(--color-created)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="completed"
              fill="var(--color-completed)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="cancelled"
              fill="var(--color-cancelled)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
