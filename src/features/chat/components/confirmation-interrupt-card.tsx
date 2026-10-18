"use client";

import React, { useState } from "react";
import {
  Check,
  X,
  Package,
  Truck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export interface PendingApprovalData {
  approval_id?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
  target_version?: number;
  preview?: Record<string, any>;
  expires_at?: string;
  tool_call?: {
    name?: string;
    args?: Record<string, any>;
  };
}

export interface ConfirmationInterruptCardProps {
  data: PendingApprovalData;
  onResolve: (decision: { approved: boolean; decision: string; approval_id?: string }) => void;
  onCancel?: () => void;
}

export function ConfirmationInterruptCard({
  data,
  onResolve,
  onCancel,
}: ConfirmationInterruptCardProps) {
  const [submitting, setSubmitting] = useState<"APPROVE" | "REJECT" | null>(null);

  const action = data.action || data.tool_call?.name || "action";
  const targetId = data.target_id || "N/A";
  const preview = data.preview || {};
  const isOrderConfirm = action.includes("order");
  const isShipmentDispatch = action.includes("shipment");

  const title = isOrderConfirm
    ? "Xác nhận đơn hàng"
    : isShipmentDispatch
    ? "Xuất kho vận đơn"
    : "Yêu cầu phê duyệt";

  const handleApprove = () => {
    setSubmitting("APPROVE");
    onResolve({
      approved: true,
      decision: "APPROVE",
      approval_id: data.approval_id,
    });
  };

  const handleReject = () => {
    setSubmitting("REJECT");
    onResolve({
      approved: false,
      decision: "REJECT",
      approval_id: data.approval_id,
    });
  };

  return (
    <Card size="sm" className="my-2 border-border/80 bg-card text-card-foreground shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              {isShipmentDispatch ? (
                <Truck className="size-3.5" />
              ) : isOrderConfirm ? (
                <Package className="size-3.5" />
              ) : (
                <ShieldAlert className="size-3.5" />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xs font-semibold truncate leading-tight">
                {title}
              </CardTitle>
              <CardDescription className="text-[11px] font-mono truncate">
                {preview.orderNumber || preview.shipmentNumber || (targetId !== "N/A" ? `${targetId.slice(0, 16)}...` : "")}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
            Chờ duyệt
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0 pb-3">
        {/* Detail specs */}
        <div className="rounded-md bg-muted/40 p-2.5 space-y-1.5 text-xs">
          {preview.customerName && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Khách hàng</span>
              <span className="font-medium text-foreground truncate max-w-[60%]">
                {preview.customerName}
              </span>
            </div>
          )}

          {preview.warehouseName && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Kho xuất</span>
              <span className="font-medium text-foreground truncate max-w-[60%]">
                {preview.warehouseName}
              </span>
            </div>
          )}

          {preview.totalQuantity !== undefined && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Số lượng</span>
              <span className="font-medium text-foreground">
                {preview.totalQuantity} sản phẩm
              </span>
            </div>
          )}

          {preview.carrierName && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Đơn vị vận chuyển</span>
              <span className="font-medium text-foreground">
                {preview.carrierName}
              </span>
            </div>
          )}

          {/* Dòng hàng kiểm tra kho */}
          {Array.isArray(preview.lines) && preview.lines.length > 0 && (
            <div className="pt-1.5 border-t border-border/40 space-y-1">
              <div className="text-[10px] text-muted-foreground font-medium">
                Kiểm tra khả dụng ({preview.lines.length} mặt hàng):
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-0.5">
                {preview.lines.map((line: any, idx: number) => {
                  const isSufficient = line.sufficient !== false;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] bg-background/60 rounded px-1.5 py-0.5 border border-border/30"
                    >
                      <span className="truncate max-w-[65%] font-medium text-foreground">
                        {line.productName || line.skuSnapshot || `SP #${idx + 1}`}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                        <span className="text-muted-foreground">{line.quantity}</span>
                        {isSufficient ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="size-2.5" /> Đủ
                          </span>
                        ) : (
                          <span className="text-destructive flex items-center gap-0.5">
                            <AlertCircle className="size-2.5" /> Thiếu
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isOrderConfirm && !isShipmentDispatch && Object.keys(preview).length > 0 && (
            <pre className="font-mono text-[10px] text-muted-foreground max-h-24 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(preview, null, 2)}
            </pre>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-1 flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={submitting !== null}
          onClick={handleReject}
          className="text-xs h-7 px-2.5"
        >
          {submitting === "REJECT" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <X className="size-3" />
          )}
          <span>Từ chối</span>
        </Button>

        <Button
          size="sm"
          variant="default"
          disabled={submitting !== null}
          onClick={handleApprove}
          className="text-xs h-7 px-3"
        >
          {submitting === "APPROVE" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Check className="size-3" />
          )}
          <span>Phê duyệt</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
