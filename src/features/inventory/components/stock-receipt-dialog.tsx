"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
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
import { WarehousePicker } from "@/features/master-data";
import { ProductPicker } from "@/features/master-data";
import { createStockReceiptApi } from "../api/inventory.api";
import {
  createStockReceiptSchema,
  type CreateStockReceiptInput,
} from "../schemas/inventory.schema";
import { createIdempotencyKey } from "../utils/quantity";
import { resolveErrorMessage } from "../utils/error";

export interface StockReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWarehouseId?: string;
  onCreated: () => void;
}

interface ReceiptLineState {
  id: string;
  productId: string;
  quantity: string;
}

function StockReceiptForm({
  initialWarehouseId,
  onClose,
  onCreated,
}: {
  initialWarehouseId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [warehouseId, setWarehouseId] = React.useState(initialWarehouseId || "");
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [lines, setLines] = React.useState<ReceiptLineState[]>([
    {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "line-1",
      productId: "",
      quantity: "",
    },
  ]);
  const [idempotencyKey] = React.useState(() => createIdempotencyKey());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `line-${Date.now()}`,
        productId: "",
        quantity: "",
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      toast.error("Phiếu nhập kho phải có ít nhất 1 dòng sản phẩm");
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (index: number, field: "productId" | "quantity", value: string) => {
    setError(null);
    if (field === "productId" && value) {
      const duplicate = lines.some((l, i) => i !== index && l.productId === value);
      if (duplicate) {
        setError("Sản phẩm này đã có trong danh sách dòng hàng. Vui lòng cộng dồn số lượng.");
        return;
      }
    }
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!warehouseId) {
      setError("Vui lòng chọn kho hàng tiếp nhận");
      return;
    }

    if (lines.length === 0) {
      setError("Vui lòng thêm ít nhất một dòng hàng");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.productId) {
        setError(`Dòng hàng thứ ${i + 1} chưa chọn sản phẩm`);
        return;
      }
      if (!line.quantity || !/^\d{1,15}(\.\d{1,3})?$/.test(line.quantity.trim()) || line.quantity.trim() === "0") {
        setError(`Số lượng ở dòng hàng thứ ${i + 1} phải là số dương hợp lệ (tối đa 3 số thập phân)`);
        return;
      }
    }

    const productIds = lines.map((l) => l.productId);
    if (new Set(productIds).size !== productIds.length) {
      setError("Một sản phẩm không được xuất hiện nhiều lần trong cùng phiếu nhập");
      return;
    }

    const payload: CreateStockReceiptInput = {
      warehouseId,
      receiptNumber: receiptNumber.trim() || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity.trim(),
      })),
    };

    const validation = createStockReceiptSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Dữ liệu phiếu nhập không hợp lệ");
      return;
    }

    setSubmitting(true);
    try {
      await createStockReceiptApi(validation.data, idempotencyKey);
      toast.success("Tạo phiếu nhập kho thành công");
      onCreated();
      onClose();
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl">
      <DialogHeader className="p-4 border-b">
        <DialogTitle className="text-base font-semibold">Tạo phiếu nhập kho</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Ghi nhận số lượng thực tế nhập vào kho. Hệ thống sẽ tăng tồn kho và lưu vết kiểm toán.
        </DialogDescription>
      </DialogHeader>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {error && (
          <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Kho nhận hàng <span className="text-destructive">*</span>
            </Label>
            <WarehousePicker
              value={warehouseId}
              onChange={(id) => setWarehouseId(id)}
              placeholder="Chọn kho nhận hàng..."
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt-num" className="text-xs">
              Số phiếu nhập (Tùy chọn)
            </Label>
            <Input
              id="receipt-num"
              placeholder="Tự sinh nếu để trống (PN-...)"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="h-8 text-xs font-mono"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Lines section */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Chi tiết hàng hóa nhập kho ({lines.length})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              disabled={submitting}
              className="h-7 text-xs gap-1"
            >
              <Plus className="size-3" />
              Thêm dòng
            </Button>
          </div>

          <div className="space-y-2 border rounded-lg p-2.5 bg-muted/20">
            {lines.map((line, idx) => (
              <div
                key={line.id}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-card p-2 rounded-md border"
              >
                <div className="text-xs font-mono text-muted-foreground w-6 shrink-0 text-center">
                  #{idx + 1}
                </div>

                <div className="flex-1 min-w-[200px]">
                  <ProductPicker
                    value={line.productId}
                    onChange={(prodId) => handleUpdateLine(idx, "productId", prodId)}
                    placeholder="Chọn sản phẩm..."
                    disabled={submitting}
                  />
                </div>

                <div className="w-full sm:w-36 shrink-0">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Số lượng"
                    value={line.quantity}
                    onChange={(e) => handleUpdateLine(idx, "quantity", e.target.value)}
                    className="h-8 text-xs font-mono"
                    disabled={submitting}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveLine(idx)}
                  disabled={submitting || lines.length <= 1}
                  className="text-muted-foreground hover:text-destructive self-end sm:self-center"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="p-3 border-t bg-card gap-2 rounded-b-xl sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={submitting}
        >
          Hủy
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
          Xác nhận nhập kho
        </Button>
      </DialogFooter>
    </form>
  );
}

export function StockReceiptDialog({
  open,
  onOpenChange,
  initialWarehouseId,
  onCreated,
}: StockReceiptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
        {open && (
          <StockReceiptForm
            initialWarehouseId={initialWarehouseId}
            onClose={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
