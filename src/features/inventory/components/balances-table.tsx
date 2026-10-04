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
import { getWarehouseApi } from "@/features/master-data/api/warehouses.api";
import { getProductApi } from "@/features/master-data/api/products.api";

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
  // Local metadata caches for warehouses and products
  const [warehouses, setWarehouses] = React.useState<Record<string, WarehouseMeta>>({});
  const [products, setProducts] = React.useState<Record<string, ProductMeta>>({});

  // Batch-fetch any unknown warehouse or product IDs
  React.useEffect(() => {
    if (!balances || balances.length === 0) return;

    const missingWarehouseIds = Array.from(
      new Set(balances.map((b) => b.warehouseId).filter((id) => !warehouses[id]))
    );
    const missingProductIds = Array.from(
      new Set(balances.map((b) => b.productId).filter((id) => !products[id]))
    );

    if (missingWarehouseIds.length > 0) {
      missingWarehouseIds.forEach((id) => {
        getWarehouseApi(id)
          .then((w) => {
            setWarehouses((prev) => ({
              ...prev,
              [id]: { code: w.code, name: w.name },
            }));
          })
          .catch(() => {
            // Ignore error
          });
      });
    }

    if (missingProductIds.length > 0) {
      missingProductIds.forEach((id) => {
        getProductApi(id)
          .then((p) => {
            setProducts((prev) => ({
              ...prev,
              [id]: { sku: p.sku, name: p.name, baseUnit: p.baseUnit },
            }));
          })
          .catch(() => {
            // Ignore error
          });
      });
    }
  }, [balances, warehouses, products]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Kho hàng</TableHead>
              <TableHead className="min-w-[200px]">Sản phẩm</TableHead>
              <TableHead className="text-right">Tồn thực tế</TableHead>
              <TableHead className="text-right">Đang giữ</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Khả dụng</TableHead>
              <TableHead className="text-right">Ngưỡng tối thiểu</TableHead>
              <TableHead className="text-center w-32">Trạng thái tồn</TableHead>
              <TableHead className="text-right min-w-[130px]">Cập nhật lúc</TableHead>
              <TableHead className="w-12 text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="size-6 mx-auto rounded-md" /></TableCell>
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
                  : `Kho: ${b.warehouseId.slice(0, 8)}…`;
                const productLabel = prod
                  ? `[${prod.sku}] ${prod.name}`
                  : `SP: ${b.productId.slice(0, 8)}…`;

                return (
                  <TableRow key={b.id}>
                    {/* Warehouse */}
                    <TableCell>
                      {wh ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-xs text-foreground">
                            {wh.name}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {wh.code}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">
                          {b.warehouseId.slice(0, 8)}…
                        </span>
                      )}
                    </TableCell>

                    {/* Product */}
                    <TableCell>
                      {prod ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-xs text-foreground">
                            {prod.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="font-mono bg-muted px-1 rounded">
                              {prod.sku}
                            </span>
                            <span>• ĐVT: {prod.baseUnit}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">
                          {b.productId.slice(0, 8)}…
                        </span>
                      )}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Thao tác</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem
                            onClick={() =>
                              onSelectMovements(b, warehouseLabel, productLabel)
                            }
                            className="cursor-pointer gap-2"
                          >
                            <History className="size-3.5 text-muted-foreground" />
                            <span>Lịch sử biến động</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              onSelectAdjust(b, warehouseLabel, productLabel)
                            }
                            className="cursor-pointer gap-2"
                          >
                            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                            <span>Điều chỉnh tồn kho</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
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
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
