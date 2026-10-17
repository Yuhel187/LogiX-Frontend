"use client";

import * as React from "react";
import {
  MoreHorizontal,
  History,
  SlidersHorizontal,
  BellRing,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { InventoryBalance } from "../schemas/inventory.schema";
import { formatQuantity } from "../utils/quantity";
import { getWarehouseApi, getProductApi } from "@/features/master-data";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { EntityLabel } from "@/components/shared/entity-label";

export interface BalancesTableProps {
  balances: InventoryBalance[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onSelectAdjust: (
    balance: InventoryBalance,
    warehouseLabel?: string,
    productLabel?: string
  ) => void;
  onSelectThreshold: (
    balance: InventoryBalance,
    warehouseLabel?: string,
    productLabel?: string
  ) => void;
  onSelectMovements: (
    balance: InventoryBalance,
    warehouseLabel?: string,
    productLabel?: string
  ) => void;
}

interface WarehouseMeta {
  code: string;
  name: string;
}

interface ProductMeta {
  sku: string;
  name: string;
  baseUnit: string;
}

export function BalancesTable({
  balances,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onSelectAdjust,
  onSelectThreshold,
  onSelectMovements,
}: BalancesTableProps) {
  const { activeTenant, accessToken } = useAuth();
  const tenantId = activeTenant?.id;
  const { t } = useTranslation();
  const [retry, setRetry] = React.useState(0);
  const [metadata, setMetadata] = React.useState<{
    key: string;
    warehouses: Record<string, WarehouseMeta>;
    products: Record<string, ProductMeta>;
    failed: boolean;
  } | null>(null);
  const warehouseIds = JSON.stringify(
    [...new Set(balances.map((item) => item.warehouseId))].sort()
  );
  const productIds = JSON.stringify(
    [...new Set(balances.map((item) => item.productId))].sort()
  );
  const metadataKey = JSON.stringify([
    tenantId,
    accessToken,
    warehouseIds,
    productIds,
    retry,
  ]);
  const current = metadata?.key === metadataKey ? metadata : null;
  const warehouses = current?.warehouses ?? {};
  const products = current?.products ?? {};

  React.useEffect(() => {
    if (!tenantId || !accessToken) return;
    let active = true;
    const warehouseKeys: string[] = JSON.parse(warehouseIds);
    const productKeys: string[] = JSON.parse(productIds);
    Promise.all([
      Promise.allSettled(warehouseKeys.map((id) => getWarehouseApi(id))),
      Promise.allSettled(productKeys.map((id) => getProductApi(id))),
    ]).then(([warehouseResults, productResults]) => {
      if (!active) return;
      const warehouses: Record<string, WarehouseMeta> = {};
      const products: Record<string, ProductMeta> = {};
      for (const result of warehouseResults)
        if (result.status === "fulfilled")
          warehouses[result.value.id] = result.value;
      for (const result of productResults)
        if (result.status === "fulfilled")
          products[result.value.id] = result.value;
      setMetadata({
        key: metadataKey,
        warehouses,
        products,
        failed: [...warehouseResults, ...productResults].some(
          (result) => result.status === "rejected"
        ),
      });
    });
    return () => {
      active = false;
    };
  }, [metadataKey, warehouseIds, productIds, tenantId, accessToken]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {current?.failed ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 text-xs text-destructive"
        >
          {t("displayLabels.metadataLoadError")}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetry((value) => value + 1)}
          >
            {t("displayLabels.retry")}
          </Button>
        </div>
      ) : null}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Kho hàng</TableHead>
              <TableHead className="min-w-[200px]">Sản phẩm</TableHead>
              <TableHead className="text-right">Tồn thực tế</TableHead>
              <TableHead className="text-right">Đang giữ</TableHead>
              <TableHead className="text-right font-semibold text-foreground">
                Khả dụng
              </TableHead>
              <TableHead className="text-right">Ngưỡng tối thiểu</TableHead>
              <TableHead className="text-center w-32">Trạng thái tồn</TableHead>
              <TableHead className="text-right min-w-[130px]">
                Cập nhật lúc
              </TableHead>
              <TableHead className="w-12 text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-44" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-20 mx-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-28 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="size-6 mx-auto rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : balances.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Không tìm thấy dữ liệu tồn kho phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              balances.map((b) => {
                const wh = warehouses[b.warehouseId];
                const prod = products[b.productId];

                const warehouseLabel = wh
                  ? `[${wh.code}] ${wh.name}`
                  : t("displayLabels.unavailable");
                const productLabel = prod
                  ? `[${prod.sku}] ${prod.name}`
                  : t("displayLabels.unavailable");

                return (
                  <TableRow key={b.id}>
                    {/* Warehouse */}
                    <TableCell>
                      <EntityLabel
                        id={b.warehouseId}
                        name={wh?.name}
                        code={wh?.code}
                        fallback={t(
                          current
                            ? "displayLabels.unavailable"
                            : "displayLabels.loading"
                        )}
                      />
                    </TableCell>

                    {/* Product */}
                    <TableCell>
                      <EntityLabel
                        id={b.productId}
                        name={prod?.name}
                        code={prod?.sku}
                        fallback={t(
                          current
                            ? "displayLabels.unavailable"
                            : "displayLabels.loading"
                        )}
                      />
                      {prod ? (
                        <span className="text-xs text-muted-foreground">
                          {prod.baseUnit}
                        </span>
                      ) : null}
                    </TableCell>

                    {/* On-hand */}
                    <TableCell className="text-right font-mono text-xs">
                      {formatQuantity(b.onHandQuantity)}
                    </TableCell>

                    {/* Reserved */}
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatQuantity(b.reservedQuantity)}
                    </TableCell>

                    {/* Available */}
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                      {formatQuantity(b.availableQuantity)}
                    </TableCell>

                    {/* Low stock threshold */}
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatQuantity(b.lowStockThreshold)}
                    </TableCell>

                    {/* Status badge */}
                    <TableCell className="text-center">
                      {b.isLowStock ? (
                        <Badge
                          variant="destructive"
                          className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] gap-1 font-medium inline-flex items-center"
                        >
                          <AlertTriangle className="size-2.5" />
                          Sắp hết hàng
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5 text-[10px] gap-1 font-medium inline-flex items-center"
                        >
                          <CheckCircle2 className="size-2.5" />
                          Đủ hàng
                        </Badge>
                      )}
                    </TableCell>

                    {/* Updated At */}
                    <TableCell className="text-right text-[11px] text-muted-foreground">
                      {new Date(b.updatedAt).toLocaleString("vi-VN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Thao tác</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          collisionPadding={16}
                          className="w-48 max-w-[calc(100vw-2rem)] text-xs"
                        >
                          <DropdownMenuItem
                            onSelect={() =>
                              onSelectMovements(b, warehouseLabel, productLabel)
                            }
                            className="cursor-pointer gap-2"
                          >
                            <History className="size-3.5 text-muted-foreground" />
                            <span>Lịch sử biến động</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() =>
                              onSelectAdjust(b, warehouseLabel, productLabel)
                            }
                            className="cursor-pointer gap-2"
                          >
                            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                            <span>Điều chỉnh tồn kho</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              onSelectThreshold(b, warehouseLabel, productLabel)
                            }
                            className="cursor-pointer gap-2"
                          >
                            <BellRing className="size-3.5 text-muted-foreground" />
                            <span>Cài đặt cảnh báo</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination matching Master Data ResourcePage */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Trang {page} / {totalPages} — Tổng cộng {total} bản ghi
          </span>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className={
                    page <= 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={
                    page >= totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
