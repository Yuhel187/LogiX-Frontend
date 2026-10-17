"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WarehousePicker } from "@/features/master-data";
import { listShipmentsApi } from "../api/shipments.api";
import { SHIPMENT_STATUSES } from "../schemas/shipment.schema";
import { useShipmentResource } from "../hooks/use-shipment-resource";
import { useShipmentListQuery } from "../hooks/use-shipment-list-query";
import { shipmentError } from "../utils/shipment-errors";
import { ShipmentStatusBadge } from "./shipment-status-badge";

export function ShipmentPoolScreen() {
  const { t, locale } = useTranslation();
  const { params, from, to, update, reset } = useShipmentListQuery();
  const { data, error, loading, reload } = useShipmentResource(
    JSON.stringify(params),
    (signal) => listShipmentsApi(params, signal)
  );
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("shipments.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("shipments.description")}
          </p>
        </div>
        <Button variant="outline" disabled={loading} onClick={reload}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          {t("shipments.actions.refresh")}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 @min-[36rem]:grid-cols-2 @min-[68rem]:grid-cols-4">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="shipment-status">
            {t("shipments.columns.status")}
          </Label>
          <Select
            value={params.status ?? "all"}
            onValueChange={(value) =>
              update({ status: value === "all" ? "" : value })
            }
          >
            <SelectTrigger id="shipment-status" className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("shipments.allStatuses")}</SelectItem>
              {SHIPMENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`shipments.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="shipment-warehouse">
            {t("shipments.columns.warehouse")}
          </Label>
          <WarehousePicker
            id="shipment-warehouse"
            value={params.warehouseId}
            onChange={(id) => update({ warehouseId: id })}
            allowClear
            allLabel={t("shipments.allWarehouses")}
            placeholder={t("shipments.allWarehouses")}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="shipment-created-from">
            {t("shipments.createdFrom")}
          </Label>
          <Input
            id="shipment-created-from"
            type="date"
            value={from}
            max={to || undefined}
            className="min-w-0"
            onChange={(e) => update({ createdFrom: e.target.value })}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="shipment-created-to">
            {t("shipments.createdTo")}
          </Label>
          <Input
            id="shipment-created-to"
            type="date"
            value={to}
            min={from || undefined}
            className="min-w-0"
            onChange={(e) => update({ createdTo: e.target.value })}
          />
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={reset}>
        {t("shipments.actions.resetFilters")}
      </Button>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {shipmentError(error.cause, t)}
            <Button variant="outline" onClick={reload}>
              {t("shipments.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <div
        className="min-w-0 overflow-hidden rounded-lg border"
        aria-busy={loading}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "shipment",
                "order",
                "customer",
                "warehouse",
                "status",
                "weight",
                "createdAt",
              ].map((column) => (
                <TableHead key={column} className="whitespace-nowrap">
                  {t(`shipments.columns.${column}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data && loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : null}
            {data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    className="block max-w-52 truncate font-mono text-xs text-primary underline-offset-4 hover:underline"
                    title={item.shipmentNumber}
                    href={`/shipments/${item.id}`}
                  >
                    {item.shipmentNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    className="text-xs hover:underline"
                    href={`/orders/${item.orderId}`}
                  >
                    {item.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{item.customerSnapshot.name}</TableCell>
                <TableCell>{item.warehouseSnapshot.name}</TableCell>
                <TableCell>
                  <ShipmentStatusBadge status={item.status} />
                  {item.dispatchIntent?.status === "PENDING" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("shipments.dispatch.processing")}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatDecimal(item.totalWeight, locale)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatDateTime(item.createdAt, locale)}
                </TableCell>
              </TableRow>
            ))}
            {data?.items.length === 0 && !error ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  {t("shipments.empty")}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      {data ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p>
            {t("shipments.pagination", {
              page: data.page,
              pages: totalPages,
              total: data.total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || data.page <= 1}
              onClick={() => update({ page: String(data.page - 1) })}
            >
              <ChevronLeft className="size-4" />
              {t("shipments.actions.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || data.page >= totalPages}
              onClick={() => update({ page: String(data.page + 1) })}
            >
              {t("shipments.actions.next")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t("shipments.refreshHint")}
      </p>
    </div>
  );
}
