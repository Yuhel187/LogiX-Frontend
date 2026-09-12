import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string | number;
    isPositive: boolean;
    label?: string;
  };
  accentColor?: "emerald" | "blue" | "amber" | "indigo" | "rose";
  className?: string;
}

const colorMap = {
  emerald: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/15 border-emerald-500/20",
  blue: "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/15 border-blue-500/20",
  amber: "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/15 border-amber-500/20",
  indigo: "text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-500/15 border-indigo-500/20",
  rose: "text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/15 border-rose-500/20",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  accentColor = "emerald",
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border border-border/80 bg-card/60 backdrop-blur-sm shadow-xs transition-all hover:shadow-md hover:border-border",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </div>
          </div>
          {Icon && (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                colorMap[accentColor]
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>

        {(trend || description) && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  trend.isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {trend.value}
              </span>
            )}
            {trend?.label && (
              <span className="text-muted-foreground">{trend.label}</span>
            )}
            {!trend && description && (
              <span className="text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
