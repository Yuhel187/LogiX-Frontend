"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardList, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { listOrdersApi } from "../api/orders.api";
import type { OrderPage } from "../schemas/order.schema";
import {
  toListOrdersParams,
  useOrderListQuery,
} from "../hooks/use-order-list-query";
import { ORDER_LIST_PAGE_SIZE } from "../constants/order.constants";
import { canCreateOrder } from "../utils/order-actions";
import { resolveOrderError } from "../utils/order-errors";
import { OrderFilters } from "./order-filters";
import { OrderStatusBadge } from "./order-status-badge";

const SKELETON_ROWS = 5;
const COLUMN_COUNT = 8;

export function OrdersScreen() {
  const { t, locale } = useTranslation();
  const { hasPermission } = useAuth();
  const router = useRouter();
  const { filters, setFilters, setPage, resetFilters, hasActiveFilters } =
    useOrderListQuery();

  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${JSON.stringify(filters)}|${reloadToken}`;
  const [result, setResult] = useState<{
    key: string;
    page: OrderPage | null;
    failure: { cause: unknown } | null;
  } | null>(null);

  const isLoading = result?.key !== requestKey;
  const current = result?.key === requestKey ? result : null;
  const items = current?.page?.items ?? [];
  const total = current?.page?.total ?? 0;
  const pageSize = current?.page?.pageSize ?? ORDER_LIST_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let active = true;
    listOrdersApi(toListOrdersParams(filters))
      .then((page) => {
        if (active) setResult({ key: requestKey, page, failure: null });
      })
      .catch((cause) => {
        if (active) setResult({ key: requestKey, page: null, failure: { cause } });
      });
    return () => {
      active = false;
    };
  }, [filters, requestKey]);

  const reload = () => setReloadToken((value) => value + 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("orders.list.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("orders.list.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw className={isLoading ? "size-4 animate-spin" : "size-4"} />
            <span className="hidden sm:inline">{t("orders.actions.refresh")}</span>
          </Button>
          {canCreateOrder(hasPermission) ? (
            <Button asChild>
              <Link href="/orders/new">
                <Plus className="size-4" />
                {t("orders.actions.create")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <OrderFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onChange={setFilters}
        onReset={resetFilters}
      />

      {current?.failure ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{resolveOrderError(current.failure.cause, t).message}</span>
            <Button variant="outline" size="sm" onClick={reload}>
              {t("orders.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">{t("orders.list.columns.orderNumber")}</TableHead>
              <TableHead className="min-w-[180px]">{t("orders.list.columns.customer")}</TableHead>
              <TableHead className="min-w-[160px]">{t("orders.list.columns.warehouse")}</TableHead>
              <TableHead>{t("orders.list.columns.status")}</TableHead>
              <TableHead className="min-w-[130px]">{t("orders.shortage.column")}</TableHead>
              <TableHead className="text-right">{t("orders.list.columns.totalWeight")}</TableHead>
              <TableHead className="text-right">{t("orders.list.columns.totalVolume")}</TableHead>
              <TableHead className="text-right min-w-[130px]">{t("orders.list.columns.createdAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 && !current?.failure ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT}>
                  <Empty className="py-10">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ClipboardList />
                      </EmptyMedia>
                      <EmptyTitle>
                        {hasActiveFilters
                          ? t("orders.list.emptyFilteredTitle")
                          : t("orders.list.emptyTitle")}
                      </EmptyTitle>
                      <EmptyDescription>
                        {hasActiveFilters
                          ? t("orders.list.emptyFilteredDescription")
                          : t("orders.list.emptyDescription")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              items.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <TableCell>
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-mono text-xs font-medium hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.customerCode}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{order.warehouseName}</div>
                    <div className="text-xs text-muted-foreground">{order.warehouseCode}</div>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                    {order.cancellationRequestedAt ? <p className="mt-1 text-xs text-muted-foreground">{t("orders.cancel.processing")}</p> : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.status === "PENDING_STOCK" && order.pendingSince ? formatDateTime(order.pendingSince, locale) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatDecimal(order.totalWeight, locale)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatDecimal(order.totalVolume, locale)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDateTime(order.createdAt, locale)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && total > 0 ? (
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("orders.list.pageInfo", {
              page: filters.page,
              totalPages,
              total,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => setPage(filters.page - 1)}
            >
              <ChevronLeft className="size-3.5" />
              {t("orders.list.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= totalPages}
              onClick={() => setPage(filters.page + 1)}
            >
              {t("orders.list.next")}
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
