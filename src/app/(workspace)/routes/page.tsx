"use client";

import * as React from "react";
import {
  RefreshCw,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MOCK_ROUTE_PLAN,
  RouteMapWrapper,
  RouteSummaryPanel,
  type RoutePlan,
} from "@/features/routes";

export default function RoutesPage() {
  const [routePlan, setRoutePlan] = React.useState<RoutePlan>(MOCK_ROUTE_PLAN);
  const [showBaseline, setShowBaseline] = React.useState<boolean>(true);
  const [selectedStopId, setSelectedStopId] = React.useState<string | null>(null);
  const [isReoptimizing, setIsReoptimizing] = React.useState<boolean>(false);

  const handleReoptimize = () => {
    setIsReoptimizing(true);
    toast.info("Đang tính toán lại ma trận OSRM & giải thuật OR-Tools…");

    setTimeout(() => {
      setIsReoptimizing(false);
      toast.success("Tối ưu hóa hoàn tất!", {
        description: "Phương án tối ưu đã giảm 25.35% quãng đường so với thứ tự ban đầu.",
      });
    }, 1200);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 space-y-4 overflow-hidden">
      {/* Page Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <RouteIcon className="w-6 h-6 text-primary" />
              Điều Phối & Tối Ưu Tuyến Đường
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Mạng lưới đường bộ OSRM
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Lập lộ trình giao hàng đa điểm tại TP.HCM, tự động kiểm tra tải trọng và so sánh đối chứng khoa học với Baselines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9"
            onClick={handleReoptimize}
            disabled={isReoptimizing}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isReoptimizing ? "animate-spin" : ""}`} />
            {isReoptimizing ? "Đang tính toán…" : "Chạy lại tối ưu"}
          </Button>

          <Button
            size="sm"
            className="text-xs h-9 bg-primary text-primary-foreground shadow-xs"
            onClick={() => {
              toast.info("Gợi ý từ Copilot", {
                description: "Bạn có thể mở Copilot ở góc phải màn hình và hỏi: 'Tối ưu tuyến hôm nay giúp tôi'.",
              });
            }}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
            Hỏi Copilot AI
          </Button>
        </div>
      </div>

      {/* Main Workspace Area (2 Columns) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* Left Column: Interactive Map Canvas (7 / 12 cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 h-full min-h-[400px] flex flex-col">
          <RouteMapWrapper
            routePlan={routePlan}
            showBaseline={showBaseline}
            onToggleBaseline={setShowBaseline}
            selectedStopId={selectedStopId}
            onSelectStop={setSelectedStopId}
          />
        </div>

        {/* Right Column: Route Details & Approval Timeline (5 / 12 cols on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 h-full min-h-[400px] flex flex-col">
          <RouteSummaryPanel
            routePlan={routePlan}
            selectedStopId={selectedStopId}
            onSelectStop={setSelectedStopId}
            onApproveSuccess={(approved) => setRoutePlan(approved)}
          />
        </div>
      </div>
    </div>
  );
}
