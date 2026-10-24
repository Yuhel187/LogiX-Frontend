"use client";

import * as React from "react";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  fetchSampleRoute,
  optimizeRoute,
  RouteMapWrapper,
  RouteSummaryPanel,
  type RoutePlan,
} from "@/features/routes";

export default function RoutesPage() {
  const [routePlan, setRoutePlan] = React.useState<RoutePlan | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showBaseline, setShowBaseline] = React.useState<boolean>(true);
  const [selectedStopId, setSelectedStopId] = React.useState<string | null>(null);
  const [isReoptimizing, setIsReoptimizing] = React.useState<boolean>(false);

  const loadRoute = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const plan = await fetchSampleRoute();
      setRoutePlan(plan);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể kết nối đến route-optimizer-service.";
      setError(message);
      toast.error("Không thể tải lộ trình từ backend", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  const handleReoptimize = async () => {
    setIsReoptimizing(true);
    toast.info("Đang tính toán lại ma trận OSRM & giải thuật OR-Tools…");

    try {
      const updatedPlan = await optimizeRoute();
      setRoutePlan(updatedPlan);
      toast.success("Tối ưu hóa hoàn tất!", {
        description: `Phương án tối ưu đã giảm ${updatedPlan.savingsPercent}% quãng đường (tiết kiệm ${updatedPlan.distanceSavedKm} km so với ban đầu).`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error("Lỗi tối ưu hóa tuyến đường", {
        description: message,
      });
    } finally {
      setIsReoptimizing(false);
    }
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
              Google OR-Tools & OSRM
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
            disabled={isReoptimizing || isLoading}
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

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 p-8 space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">Đang tải phương án tuyến đường từ Backend…</p>
            <p className="text-xs text-muted-foreground">Kết nối OSRM Road Network & Google OR-Tools Engine (:8003)</p>
          </div>
        </div>
      )}

      {/* Error Fallback State */}
      {!isLoading && error && !routePlan && (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 space-y-4 text-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-foreground">Không thể kết nối đến Route Optimizer Service</h3>
            <p className="text-xs text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground pt-1">
              Vui lòng đảm bảo backend đang chạy: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">pnpm dev:route</code> trên cổng 8003.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={loadRoute}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Thử lại
          </Button>
        </div>
      )}

      {/* Main Workspace Area (2 Columns) */}
      {!isLoading && routePlan && (
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
      )}
    </div>
  );
}
