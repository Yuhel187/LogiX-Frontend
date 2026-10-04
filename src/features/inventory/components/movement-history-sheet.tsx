"use client";

import * as React from "react";
import { History, Loader2, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMovementsApi } from "../api/inventory.api";
import type { StockMovement } from "../schemas/inventory.schema";
import { formatQuantity, formatSignedQuantity } from "../utils/quantity";
import { resolveErrorMessage } from "../utils/error";

export interface MovementHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId?: string;
  productId?: string;
  warehouseLabel?: string;
  productLabel?: string;
}

function MovementHistoryContent({
  warehouseId,
  productId,
  warehouseLabel,
  productLabel,
}: {
  warehouseId?: string;
  productId?: string;
  warehouseLabel?: string;
  productLabel?: string;
}) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const pageSize = 15;

  React.useEffect(() => {
    let active = true;

    listMovementsApi({
      warehouseId: warehouseId || undefined,
      productId: productId || undefined,
      page,
      pageSize,
    })
      .then((res) => {
        if (active) {
          setMovements(res.items);
          setTotal(res.total);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(resolveErrorMessage(err));
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [warehouseId, productId, page]);

  const handlePageChange = (newPage: number) => {
    setLoading(true);
    setPage(newPage);
  };

  const renderMovementBadge = (type: StockMovement["movementType"]) => {
    switch (type) {
      case "RECEIPT":
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Nhập kho</Badge>;
      case "ISSUE":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20">Xuất kho</Badge>;
      case "ADJUSTMENT_IN":
        return <Badge className="bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20">Điều chỉnh (+)</Badge>;
      case "ADJUSTMENT_OUT":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">Điều chỉnh (−)</Badge>;
      case "REVERSAL":
        return <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20">Hoàn tác</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <SheetHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <SheetTitle className="text-sm font-semibold">Lịch sử biến động tồn kho</SheetTitle>
        </div>
        <SheetDescription className="text-xs text-muted-foreground">
          {warehouseLabel && productLabel
            ? `${warehouseLabel} • ${productLabel}`
            : warehouseLabel
            ? `Kho: ${warehouseLabel}`
            : productLabel
            ? `Sản phẩm: ${productLabel}`
            : "Toàn bộ lịch sử biến động trong tổ chức (mới nhất xếp trước)"}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="size-4 animate-spin" />
            <span>Đang tải lịch sử biến động...</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && movements.length === 0 && (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Chưa có biến động tồn kho nào được ghi nhận.
          </div>
        )}

        {!loading && !error && movements.length > 0 && (
          <div className="space-y-2.5">
            {movements.map((m) => {
              const isPositive = !m.quantityDelta.startsWith("-");
              return (
                <div
                  key={m.id}
                  className="border rounded-lg p-3 bg-card hover:bg-accent/40 transition-colors text-xs flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {renderMovementBadge(m.movementType)}
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(m.occurredAt).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <span
                      className={`font-semibold font-mono text-sm ${
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {formatSignedQuantity(m.quantityDelta)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span>Tồn: {formatQuantity(m.beforeOnHand)}</span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {formatQuantity(m.afterOnHand)}
                      </span>
                    </div>
                    <div className="truncate max-w-[200px]">
                      Ref: {m.referenceType} ({m.referenceId.slice(0, 8)}…)
                    </div>
                  </div>

                  {m.reason && (
                    <div className="text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1 italic">
                      Lý do: {m.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t flex items-center justify-between text-xs text-muted-foreground bg-card">
          <span>
            Trang {page} / {totalPages} ({total} bản ghi)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => handlePageChange(page - 1)}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => handlePageChange(page + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function MovementHistorySheet({
  open,
  onOpenChange,
  warehouseId,
  productId,
  warehouseLabel,
  productLabel,
}: MovementHistorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
        {open && (
          <MovementHistoryContent
            warehouseId={warehouseId}
            productId={productId}
            warehouseLabel={warehouseLabel}
            productLabel={productLabel}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
