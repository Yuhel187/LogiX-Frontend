"use client";

import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
import type { RoutePlan } from "../types";

const DynamicRouteMap = dynamic(
  () => import("./route-map").then((mod) => mod.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] rounded-xl border border-border bg-muted/20 flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <MapPin className="w-10 h-10 text-primary animate-bounce" />
          <Loader2 className="w-5 h-5 text-primary/70 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="text-sm font-medium text-foreground">Đang tải bản đồ mạng lưới đường bộ OSRM…</div>
        <div className="text-xs text-muted-foreground">Khởi tạo dữ liệu giao thông thực tế TP.HCM</div>
      </div>
    ),
  }
);

interface RouteMapWrapperProps {
  routePlan: RoutePlan;
  showBaseline?: boolean;
  onToggleBaseline?: (show: boolean) => void;
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string | null) => void;
}

export function RouteMapWrapper(props: RouteMapWrapperProps) {
  return <DynamicRouteMap {...props} />;
}
