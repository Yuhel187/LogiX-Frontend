"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listBalancesApi } from "../api/inventory.api";
import type { InventoryBalance } from "../schemas/inventory.schema";
import { BalanceFilters } from "./balance-filters";
import { BalancesTable } from "./balances-table";
import { StockReceiptDialog } from "./stock-receipt-dialog";
import { AdjustStockDialog } from "./adjust-stock-dialog";
import { LowStockThresholdDialog } from "./low-stock-threshold-dialog";
import { MovementHistorySheet } from "./movement-history-sheet";
import { resolveErrorMessage } from "../utils/error";

export function InventoryBalancesView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL params
  const warehouseId = searchParams.get("warehouseId") || undefined;
  const productId = searchParams.get("productId") || undefined;
  const lowStockOnly = searchParams.get("lowStockOnly") === "true";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = 20;

  // Reload trigger
  const [reloadToken, setReloadToken] = React.useState(0);
  const requestKey = `${warehouseId ?? ""}|${productId ?? ""}|${lowStockOnly}|${page}|${pageSize}|${reloadToken}`;

  // Derived loading state avoids synchronous setState inside effect
  const [result, setResult] = React.useState<{
    key: string;
    items: InventoryBalance[];
    total: number;
    error: string | null;
  } | null>(null);

  const loading = result?.key !== requestKey;
  const balances = result?.key === requestKey ? result.items : [];
  const total = result?.key === requestKey ? result.total : 0;
  const error = result?.key === requestKey ? result.error : null;

  const reload = React.useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  // Fetch balances asynchronously
  React.useEffect(() => {
    let cancelled = false;

    listBalancesApi({
      warehouseId,
      productId,
      lowStockOnly: lowStockOnly || undefined,
      page,
      pageSize,
    })
      .then((res) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            items: res.items,
            total: res.total,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            items: [],
            total: 0,
            error: resolveErrorMessage(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, warehouseId, productId, lowStockOnly, page, pageSize]);

  // Dialogs state
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [adjustTarget, setAdjustTarget] = React.useState<{
    balance: InventoryBalance;
    warehouseLabel?: string;
    productLabel?: string;
  } | null>(null);
  const [thresholdTarget, setThresholdTarget] = React.useState<{
    balance: InventoryBalance;
    warehouseLabel?: string;
    productLabel?: string;
  } | null>(null);
  const [movementTarget, setMovementTarget] = React.useState<{
    warehouseId?: string;
    productId?: string;
    warehouseLabel?: string;
    productLabel?: string;
  } | null>(null);
  const [globalMovementOpen, setGlobalMovementOpen] = React.useState(false);

  // URL sync helper
  const updateUrl = (updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleFilterChange = (filters: {
    warehouseId?: string;
    productId?: string;
    lowStockOnly?: boolean;
  }) => {
    updateUrl({
      ...filters,
      lowStockOnly: filters.lowStockOnly ? "true" : null,
      page: "1", // reset to page 1 on filter change
    });
  };

  const handleResetFilters = () => {
    updateUrl({
      warehouseId: null,
      productId: null,
      lowStockOnly: null,
      page: "1",
    });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: String(newPage) });
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quản lý tồn kho</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi số lượng hàng hóa theo từng kho, ghi nhận nhập kho và điều chỉnh tồn kho.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={reload}
            disabled={loading}
            title="Tải lại danh sách"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setGlobalMovementOpen(true)}
          >
            <History className="size-4" />
            <span>Lịch sử biến động</span>
          </Button>

          <Button onClick={() => setReceiptOpen(true)}>
            <Plus className="size-4" />
            <span>Nhập kho</span>
          </Button>
        </div>
      </div>

      {/* Error alert if any */}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Filter Toolbar */}
      <BalanceFilters
        warehouseId={warehouseId}
        productId={productId}
        lowStockOnly={lowStockOnly}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Balances Data Table */}
      <BalancesTable
        balances={balances}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        onSelectMovements={(balance, whLabel, prodLabel) => {
          setMovementTarget({
            warehouseId: balance.warehouseId,
            productId: balance.productId,
            warehouseLabel: whLabel,
            productLabel: prodLabel,
          });
        }}
        onSelectAdjust={(balance, whLabel, prodLabel) => {
          setAdjustTarget({
            balance,
            warehouseLabel: whLabel,
            productLabel: prodLabel,
          });
        }}
        onSelectThreshold={(balance, whLabel, prodLabel) => {
          setThresholdTarget({
            balance,
            warehouseLabel: whLabel,
            productLabel: prodLabel,
          });
        }}
      />

      {/* Dialog: Stock Receipt */}
      <StockReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        initialWarehouseId={warehouseId}
        onCreated={reload}
      />

      {/* Dialog: Adjust Stock */}
      <AdjustStockDialog
        open={Boolean(adjustTarget)}
        onOpenChange={(open) => !open && setAdjustTarget(null)}
        balance={adjustTarget?.balance || null}
        warehouseLabel={adjustTarget?.warehouseLabel}
        productLabel={adjustTarget?.productLabel}
        onAdjusted={reload}
      />

      {/* Dialog: Update Low Stock Threshold */}
      <LowStockThresholdDialog
        open={Boolean(thresholdTarget)}
        onOpenChange={(open) => !open && setThresholdTarget(null)}
        balance={thresholdTarget?.balance || null}
        warehouseLabel={thresholdTarget?.warehouseLabel}
        productLabel={thresholdTarget?.productLabel}
        onUpdated={reload}
      />

      {/* Sheet: Specific Balance Movement History */}
      <MovementHistorySheet
        open={Boolean(movementTarget)}
        onOpenChange={(open) => !open && setMovementTarget(null)}
        warehouseId={movementTarget?.warehouseId}
        productId={movementTarget?.productId}
        warehouseLabel={movementTarget?.warehouseLabel}
        productLabel={movementTarget?.productLabel}
      />

      {/* Sheet: Global Movement History */}
      <MovementHistorySheet
        open={globalMovementOpen}
        onOpenChange={setGlobalMovementOpen}
      />
    </div>
  );
}
