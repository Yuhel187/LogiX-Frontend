"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adjustStockApi } from "../api/inventory.api";
import { adjustStockSchema, type InventoryBalance } from "../schemas/inventory.schema";
import {
  createIdempotencyKey,
  formatQuantity,
} from "../utils/quantity";
import { resolveErrorMessage } from "../utils/error";

export interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: InventoryBalance | null;
  warehouseLabel?: string;
  productLabel?: string;
  onAdjusted: () => void;
}

function AdjustStockForm({
  balance,
  warehouseLabel,
  productLabel,
  onClose,
  onAdjusted,
}: {
  balance: InventoryBalance;
  warehouseLabel?: string;
  productLabel?: string;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [type, setType] = React.useState<"ADD" | "SUBTRACT">("ADD");
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [idempotencyKey] = React.useState(() => createIdempotencyKey());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Safe decimal string addition / subtraction for preview
  const computePreview = () => {
    const rawVal = quantity.trim();
    if (!rawVal || !/^\d+(\.\d{1,3})?$/.test(rawVal)) {
      return null;
    }
    const currentOnHand = parseFloat(balance.onHandQuantity);
    const delta = parseFloat(rawVal) * (type === "ADD" ? 1 : -1);
    const newOnHand = currentOnHand + delta;
    const currentAvailable = parseFloat(balance.availableQuantity);
    const newAvailable = currentAvailable + delta;

    return {
      newOnHand: newOnHand.toFixed(3),
      newAvailable: newAvailable.toFixed(3),
      isNegative: newOnHand < 0 || newAvailable < 0,
    };
  };

  const preview = computePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedQty = quantity.trim();
    if (!trimmedQty) {
      setError("Vui lòng nhập số lượng cần điều chỉnh");
      return;
    }

    const delta = type === "ADD" ? trimmedQty : `-${trimmedQty}`;

    const validation = adjustStockSchema.safeParse({
      quantityDelta: delta,
      reason: reason.trim(),
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Dữ liệu không hợp lệ");
      return;
    }

    setSubmitting(true);
    try {
      await adjustStockApi(
        balance.warehouseId,
        balance.productId,
        validation.data,
        idempotencyKey
      );
      toast.success("Điều chỉnh tồn kho thành công");
      onAdjusted();
      onClose();
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold">
          Điều chỉnh tồn kho thủ công
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {warehouseLabel && productLabel
            ? `${warehouseLabel} • ${productLabel}`
            : "Thay đổi số lượng tồn thực tế với lý do bắt buộc để phục vụ kiểm toán."}
        </DialogDescription>
      </DialogHeader>

      {/* Current balance summary */}
      <div className="my-4 rounded-lg bg-muted/50 p-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="text-[11px] text-muted-foreground">Tồn thực tế</div>
          <div className="font-semibold font-mono text-foreground mt-0.5">
            {formatQuantity(balance.onHandQuantity)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Đang giữ</div>
          <div className="font-semibold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            {formatQuantity(balance.reservedQuantity)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Khả dụng</div>
          <div className="font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatQuantity(balance.availableQuantity)}
          </div>
        </div>
      </div>

      <div className="space-y-4 py-1">
        {error && (
          <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Type selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">Hình thức điều chỉnh</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={type === "ADD" ? "default" : "outline"}
              onClick={() => setType("ADD")}
              className="w-full text-xs font-medium"
            >
              + Tăng tồn kho
            </Button>
            <Button
              type="button"
              size="sm"
              variant={type === "SUBTRACT" ? "default" : "outline"}
              onClick={() => setType("SUBTRACT")}
              className="w-full text-xs font-medium"
            >
              − Giảm tồn kho
            </Button>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <Label htmlFor="adjust-qty" className="text-xs">
            Số lượng thay đổi <span className="text-destructive">*</span>
          </Label>
          <Input
            id="adjust-qty"
            type="text"
            inputMode="decimal"
            placeholder="VD: 10 hoặc 2.500"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-8 text-xs font-mono"
            disabled={submitting}
          />
        </div>

        {/* Preview */}
        {preview && (
          <div
            className={`p-2.5 rounded-md border text-xs flex items-center justify-between ${
              preview.isNegative
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-muted/40 border-border/60 text-muted-foreground"
            }`}
          >
            <span>Dự kiến sau điều chỉnh:</span>
            <div className="flex items-center gap-1.5 font-mono font-semibold">
              <span>{formatQuantity(balance.onHandQuantity)}</span>
              <ArrowRight className="size-3.5" />
              <span className={preview.isNegative ? "text-destructive" : "text-foreground"}>
                {formatQuantity(preview.newOnHand)}
              </span>
            </div>
          </div>
        )}

        {/* Reason */}
        <div className="space-y-1.5">
          <Label htmlFor="adjust-reason" className="text-xs">
            Lý do điều chỉnh <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="adjust-reason"
            rows={2}
            placeholder="VD: Hàng hỏng rách bao bì, kiểm kê thực tế chênh lệch..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs resize-none"
            disabled={submitting}
          />
        </div>
      </div>

      <DialogFooter className="mt-4 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={submitting}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !quantity.trim() || !reason.trim()}
        >
          {submitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
          Xác nhận điều chỉnh
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AdjustStockDialog({
  open,
  onOpenChange,
  balance,
  warehouseLabel,
  productLabel,
  onAdjusted,
}: AdjustStockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && balance && (
          <AdjustStockForm
            balance={balance}
            warehouseLabel={warehouseLabel}
            productLabel={productLabel}
            onClose={() => onOpenChange(false)}
            onAdjusted={onAdjusted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
