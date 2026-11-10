import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Standard Skeleton for Table / List pages
 * Matches Master Data, Orders, Shipments, Transport, Admin Users/Orgs
 */
export function TablePageSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("w-full space-y-6 animate-in fade-in-50 duration-200", className)}>
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 sm:w-64 rounded-md" />
          <Skeleton className="h-4 w-72 sm:w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Skeleton className="h-10 w-28 sm:w-36 rounded-lg" />
        </div>
      </div>

      {/* Filter and Search Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Skeleton className="h-10 flex-1 max-w-md rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>

      {/* Table Container Skeleton */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card/40 shadow-xs">
        {/* Table Header Row */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-muted/40 border-b border-border/60">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>

        {/* Table Body Rows */}
        <div className="divide-y divide-border/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-6 py-4 hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-3 w-1/3">
                <Skeleton className="size-8 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="size-7 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-40 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Standard Skeleton for Detail / View / Edit screens
 * Matches Order Detail, Shipment Detail, Trip Detail, Organization Detail
 */
export function DetailPageSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("w-full space-y-6 animate-in fade-in-50 duration-200", className)}>
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-16 rounded" />
        <span className="text-muted-foreground/40">/</span>
        <Skeleton className="h-3.5 w-24 rounded" />
        <span className="text-muted-foreground/40">/</span>
        <Skeleton className="h-3.5 w-32 rounded" />
      </div>

      {/* Header Banner Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-xl shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-48 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-64 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* KPI / Metric Summary Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/70 p-4 space-y-3 bg-card/40"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-28 rounded" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border/70 p-6 space-y-4 bg-card/40">
            <Skeleton className="h-5 w-40 rounded" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 p-6 space-y-4 bg-card/40">
            <Skeleton className="h-5 w-32 rounded" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Standard Skeleton for Forecast and Analytics screens
 */
export function ForecastSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("w-full space-y-6 animate-in fade-in-50 duration-200", className)}>
      {/* Header and Controls Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/50">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 rounded-md" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Summary Strip (4 KPI metrics) */}
      <div className="grid grid-cols-2 divide-y divide-border rounded-lg border border-border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 space-y-2">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-7 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Chart Section Skeleton */}
      <div className="rounded-xl border border-border/70 p-6 space-y-4 bg-card/40">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-3.5 w-64 rounded" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>

      {/* Breakdown Table Skeleton */}
      <div className="rounded-xl border border-border/70 p-6 space-y-4 bg-card/40">
        <Skeleton className="h-5 w-44 rounded" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Standard Skeleton for Account & Settings screens
 */
export function SettingsPageSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("w-full max-w-5xl mx-auto space-y-8 animate-in fade-in-50 duration-200", className)}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-16 rounded" />
        <span className="text-muted-foreground/40">/</span>
        <Skeleton className="h-3.5 w-24 rounded" />
      </div>

      {/* Profile Header Banner */}
      <div className="rounded-3xl border border-border/80 bg-muted/20 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Skeleton className="size-20 sm:size-24 rounded-full shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-48 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-56 rounded" />
          </div>
        </div>
      </div>

      {/* Tabs List */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Settings Form Card */}
      <div className="rounded-2xl border border-border/70 bg-card/40 p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-3.5 w-64 rounded" />
        </div>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl mt-4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Standard Skeleton for Grid / Card views (like Driver Trips, Fleet view)
 */
export function CardGridSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("w-full space-y-6 animate-in fade-in-50 duration-200", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/70 p-5 space-y-4 bg-card/40 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-3/4 rounded" />
            </div>
            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

