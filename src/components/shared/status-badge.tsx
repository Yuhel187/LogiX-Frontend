import * as React from "react";
import { cn } from "@/lib/utils";

export type LogisticsStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "processing"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "delayed"
  | "low_stock"
  | "in_stock"
  | "out_of_stock";

interface StatusConfig {
  label: string;
  dotColor: string;
  badgeClass: string;
}

const statusConfigs: Record<LogisticsStatus, StatusConfig> = {
  draft: {
    label: "Bản nháp",
    dotColor: "bg-zinc-400",
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/60",
  },
  pending: {
    label: "Chờ xử lý",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
  },
  confirmed: {
    label: "Đã xác nhận",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60",
  },
  processing: {
    label: "Đang đóng gói",
    dotColor: "bg-indigo-500",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60",
  },
  in_transit: {
    label: "Đang vận chuyển",
    dotColor: "bg-emerald-500 animate-pulse",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
  },
  delivered: {
    label: "Đã giao thành công",
    dotColor: "bg-teal-600",
    badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60",
  },
  cancelled: {
    label: "Đã hủy",
    dotColor: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200/80 dark:border-red-800/60",
  },
  delayed: {
    label: "Chậm tiến độ",
    dotColor: "bg-rose-500 animate-ping",
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60",
  },
  in_stock: {
    label: "Đủ tồn kho",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
  },
  low_stock: {
    label: "Sắp hết hàng",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
  },
  out_of_stock: {
    label: "Hết hàng",
    dotColor: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200/80 dark:border-red-800/60",
  },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: LogisticsStatus;
  label?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
  ...props
}: StatusBadgeProps) {
  const config = statusConfigs[status] ?? {
    label: status,
    dotColor: "bg-zinc-400",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight select-none transition-colors",
        config.badgeClass,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)}
          aria-hidden="true"
        />
      )}
      <span>{label ?? config.label}</span>
    </span>
  );
}
