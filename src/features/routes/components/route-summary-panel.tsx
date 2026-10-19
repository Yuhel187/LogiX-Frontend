"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck2,
  Sparkles,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { RoutePlan } from "../types";

interface RouteSummaryPanelProps {
  routePlan: RoutePlan;
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string | null) => void;
  onApproveSuccess?: (approvedPlan: RoutePlan) => void;
}

export function RouteSummaryPanel({
  routePlan,
  selectedStopId,
  onSelectStop,
  onApproveSuccess,
}: RouteSummaryPanelProps) {
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleApprove = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const updated: RoutePlan = {
        ...routePlan,
        status: "APPROVED",
      };
      setIsSubmitting(false);
      setIsApproveOpen(false);
      toast.success("Phê duyệt lộ trình thành công", {
        description: `Chuyến xe ${routePlan.tripCode} đã được duyệt lộ trình tối ưu 21.2 km và sẵn sàng dispatch.`,
      });
      if (onApproveSuccess) onApproveSuccess(updated);
    }, 600);
  };

  const handleOverride = () => {
    if (!overrideReason.trim()) {
      toast.error("Vui lòng nhập lý do ghi đè lộ trình");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const updated: RoutePlan = {
        ...routePlan,
        status: "APPROVED",
      };
      setIsSubmitting(false);
      setIsOverrideOpen(false);
      toast.success("Đã ghi đè lộ trình thủ công thành công", {
        description: `Lý do: "${overrideReason}" đã được lưu vào nhật ký kiểm toán (Audit Log).`,
      });
      if (onApproveSuccess) onApproveSuccess(updated);
    }, 600);
  };

  const isApproved = routePlan.status === "APPROVED";

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-xs overflow-hidden">
      {/* Top Header Card */}
      <div className="p-4 border-b border-border bg-muted/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-foreground">{routePlan.tripCode}</span>
            <Badge
              variant={isApproved ? "default" : "secondary"}
              className={isApproved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"}
            >
              {isApproved ? "Đã Phê Duyệt" : "Đề Xuất Tối Ưu (Proposed)"}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>OR-Tools + OSRM</span>
          </div>
        </div>

        {/* Vehicle & Driver info */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-background p-2.5 rounded-lg border border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span className="truncate">{routePlan.vehiclePlate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span className="truncate">{routePlan.driverName}</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
            <div className="text-[11px] text-muted-foreground font-medium">Quãng đường</div>
            <div className="text-base font-bold text-blue-700 dark:text-blue-400 mt-0.5">
              {routePlan.totalDistanceKm} <span className="text-xs font-normal">km</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
              <span>↓ {routePlan.distanceSavedKm} km ({routePlan.savingsPercent}%)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
            <div className="text-[11px] text-muted-foreground font-medium">Thời gian OSRM</div>
            <div className="text-base font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">
              {routePlan.totalDurationMinutes} <span className="text-xs font-normal">phút</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Dự kiến</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
            <div className="text-[11px] text-muted-foreground font-medium">Tải trọng xe</div>
            <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
              {routePlan.totalWeightKg} <span className="text-xs font-normal">/ {routePlan.vehicleCapacityKg} kg</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              85% (An toàn)
            </div>
          </div>
        </div>
      </div>

      {/* Stop Sequence List (Timeline) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Lộ trình chi tiết ({routePlan.stops.length} điểm giao)</span>
          <span>Khối lượng</span>
        </div>

        {/* Depot Start */}
        <div className="flex items-start gap-3 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 text-xs">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
            K
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground">{routePlan.depot.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{routePlan.depot.address}</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Xuất phát · 08:00 AM</div>
          </div>
        </div>

        {/* Stops */}
        <div className="space-y-2 relative pl-3 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {routePlan.stops.map((stop) => {
            const isSelected = selectedStopId === stop.id;
            return (
              <div
                key={stop.id}
                onClick={() => onSelectStop && onSelectStop(isSelected ? null : stop.id)}
                className={`relative flex items-start gap-3 p-2.5 rounded-lg border text-xs transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/30 shadow-xs"
                    : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-amber-500 text-white"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  {stop.sequence}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate">{stop.stopName}</span>
                    <span className="font-bold text-foreground shrink-0">{stop.demandWeightKg} kg</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">{stop.address}</div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span className="text-blue-600 font-medium">+{stop.distanceFromPrevKm} km</span>
                    <span>·</span>
                    <span>Đến lúc ~08:{stop.estimatedArrivalMinutes < 10 ? `0${stop.estimatedArrivalMinutes}` : stop.estimatedArrivalMinutes}</span>
                    <span>·</span>
                    <span>{stop.demandVolumeM3} m³</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Depot End */}
        <div className="flex items-start gap-3 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 text-xs">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
            K
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground">Quay về {routePlan.depot.name}</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Hoàn tất chuyến · ~08:{routePlan.totalDurationMinutes}</div>
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="p-4 border-t border-border bg-muted/10 space-y-2">
        {isApproved ? (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Lộ trình đã được phê duyệt. Bạn có thể tiến hành dispatch chuyến giao hàng.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 shadow-xs"
              onClick={() => setIsApproveOpen(true)}
            >
              <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
              Phê duyệt lộ trình
            </Button>
            <Button
              variant="outline"
              className="text-xs h-9 font-medium"
              onClick={() => setIsOverrideOpen(true)}
            >
              Ghi đè thủ công
            </Button>
          </div>
        )}
      </div>

      {/* Approval Confirmation Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              Xác nhận phê duyệt phương án tuyến
            </DialogTitle>
            <DialogDescription className="text-xs">
              Thao tác này sẽ khóa phương án đề xuất tối ưu (21.2 km) làm lộ trình chính thức cho chuyến xe {routePlan.tripCode}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chuyến xe:</span>
                <span className="font-semibold">{routePlan.tripCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Xe & Tài xế:</span>
                <span className="font-semibold">{routePlan.vehiclePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số điểm giao:</span>
                <span className="font-semibold">{routePlan.stops.length} điểm dừng</span>
              </div>
              <div className="flex justify-between text-blue-600 font-bold">
                <span>Quãng đường OSRM:</span>
                <span>{routePlan.totalDistanceKm} km (Tiết kiệm 25.35%)</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Sau khi phê duyệt, thông tin sẽ được thông báo đến tài xế và sẵn sàng dispatch.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsApproveOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xử lý…" : "Đồng ý Phê duyệt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Ghi đè lộ trình thủ công (Override)</DialogTitle>
            <DialogDescription className="text-xs">
              Theo quy định nghiệp vụ BR-TRIP-005, việc thay đổi hoặc ghi đè lộ trình đề xuất của AI bắt buộc phải ghi nhận lý do vào nhật ký kiểm toán.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-medium text-foreground block mb-1">
                Lý do ghi đè <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Ví dụ: Tuyến đường Trường Chinh đang kẹt xe giờ cao điểm; khách hàng Minh Khai yêu cầu nhận hàng trước 9h..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsOverrideOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleOverride}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang lưu…" : "Xác nhận Ghi đè"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
