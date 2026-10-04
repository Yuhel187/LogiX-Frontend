"use client";

import * as React from "react";
import { FilterX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { WarehousePicker } from "@/features/master-data";
import { ProductPicker } from "@/features/master-data";

export interface BalanceFiltersProps {
  warehouseId?: string;
  productId?: string;
  lowStockOnly?: boolean;
  onFilterChange: (filters: {
    warehouseId?: string;
    productId?: string;
    lowStockOnly?: boolean;
  }) => void;
  onReset: () => void;
}

export function BalanceFilters({
  warehouseId,
  productId,
  lowStockOnly = false,
  onFilterChange,
  onReset,
}: BalanceFiltersProps) {
  const hasActiveFilters = Boolean(warehouseId || productId || lowStockOnly);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Warehouse Filter */}
      <div className="flex-1 sm:max-w-xs">
        <WarehousePicker
          value={warehouseId}
          onChange={(val) => onFilterChange({ warehouseId: val || undefined })}
          placeholder="Lọc theo kho..."
          allLabel="Tất cả kho hàng"
          allowClear
        />
      </div>

      {/* Product Filter */}
      <div className="flex-1 sm:max-w-sm">
        <ProductPicker
          value={productId}
          onChange={(val) => onFilterChange({ productId: val || undefined })}
          placeholder="Lọc theo sản phẩm..."
          allLabel="Tất cả sản phẩm"
          allowClear
        />
      </div>

      {/* Low stock toggle */}
      <div className="flex items-center gap-2 h-7 px-2.5 border rounded-md bg-input/20 shrink-0">
        <Switch
          id="low-stock-toggle"
          size="sm"
          checked={lowStockOnly}
          onCheckedChange={(checked) =>
            onFilterChange({ lowStockOnly: checked ? true : undefined })
          }
        />
        <Label
          htmlFor="low-stock-toggle"
          className="text-xs cursor-pointer flex items-center gap-1 font-medium select-none"
        >
          <AlertTriangle className="size-3 text-amber-500" />
          <span>Chỉ hàng sắp hết</span>
        </Label>
      </div>

      {/* Reset button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1 shrink-0"
        >
          <FilterX className="size-3.5" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
