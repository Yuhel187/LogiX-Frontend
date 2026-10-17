"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, FileX, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
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
import { useBoundedRefresh } from "@/lib/api/use-bounded-refresh";
import { OrderShipmentPanel } from "@/features/shipments";
import { getOrderApi, getOrderHistoryApi, getOrderShortagesApi } from "../api/orders.api";
import type { OrderDetail, OrderHistoryEntry, OrderShortage } from "../schemas/order.schema";
import { canCancelOrder, canEditOrder, canConfirmOrder } from "../utils/order-actions";
import { resolveOrderError } from "../utils/order-errors";
import { formatAddressLine } from "./customer-address-select";
import { CancelOrderDialog } from "./cancel-order-dialog";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderTimeline } from "./order-timeline";
import { VersionConflictDialog } from "./version-conflict-dialog";
import { ConfirmOrderDialog } from "./confirm-order-dialog";
import { OrderShortages } from "./order-shortages";

interface LoadedOrder {
  order: OrderDetail;
  history: OrderHistoryEntry[];
  shortages: OrderShortage[];
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

export function OrderDetailScreen({ orderId }: { orderId: string }) {
  const { t, locale } = useTranslation();
  const { hasPermission } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${orderId}|${reloadToken}`;
  const [result, setResult] = useState<{
    key: string;
    data: LoadedOrder | null;
    failure: { cause: unknown } | null;
  } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const showConflict = useCallback(() => {
    setConfirmOpen(false);
    setConflictOpen(true);
  }, []);

  const isLoading = result?.key !== requestKey;
  // Keep showing the previous data while a reload is in flight.
  const data = result?.data?.order.id === orderId ? result.data : null;
  const failure = result?.key === requestKey ? result.failure : null;

  useEffect(() => {
    let active = true;
    Promise.all([getOrderApi(orderId), getOrderHistoryApi(orderId), getOrderShortagesApi(orderId)])
      .then(([order, history, shortages]) => {
        if (active) {
          setResult({ key: requestKey, data: { order, history, shortages }, failure: null });
        }
      })
      .catch((cause) => {
        if (active) setResult({ key: requestKey, data: null, failure: { cause } });
      });
    return () => {
      active = false;
    };
  }, [orderId, requestKey]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);
  useBoundedRefresh(orderId, reload, !cancelOpen && !confirmOpen && !conflictOpen && !failure);

  if (failure) {
    const resolved = resolveOrderError(failure.cause, t);
    const notFound = resolved.reason === "ORDER_NOT_FOUND";
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileX />
          </EmptyMedia>
          <EmptyTitle>
            {notFound ? t("orders.detail.notFoundTitle") : t("orders.detail.loadFailedTitle")}
          </EmptyTitle>
          <EmptyDescription>{resolved.message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/orders">{t("orders.actions.backToList")}</Link>
          </Button>
          {notFound ? null : (
            <Button onClick={reload}>{t("orders.actions.retry")}</Button>
          )}
        </EmptyContent>
      </Empty>
    );
  }

  if (!data) {
    return (
      <div className="@container/order-detail min-w-0 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 @min-[40rem]/order-detail:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { order, history, shortages } = data;
  const address = order.deliveryAddressSnapshot;
  const warehouse = order.warehouseSnapshot;
  const customer = order.customerSnapshot;
  const editable = canEditOrder(order.status, hasPermission, order.cancellationRequestedAt, order.dispatchGrantedAt);
  const cancelable = canCancelOrder(order.status, hasPermission, order.cancellationRequestedAt, order.dispatchGrantedAt);
  const confirmable = canConfirmOrder(order.status, hasPermission, order.cancellationRequestedAt, order.dispatchGrantedAt);

  return (
    <div className="@container/order-detail min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("orders.actions.backToList")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("orders.detail.createdAt", {
              date: formatDateTime(order.createdAt, locale),
            })}
            {" · "}
            {t("orders.detail.updatedAt", {
              date: formatDateTime(order.updatedAt, locale),
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw className={isLoading ? "size-4 animate-spin" : "size-4"} />
            <span className="hidden sm:inline">{t("orders.actions.refresh")}</span>
          </Button>
          {editable ? (
            <Button variant="outline" asChild>
              <Link href={`/orders/${order.id}/edit`}>
                <Pencil className="size-4" />
                {t("orders.actions.edit")}
              </Link>
            </Button>
          ) : null}
          {confirmable ? (
            <Button onClick={() => setConfirmOpen(true)} disabled={isLoading}>
              {t(order.status === "PENDING_STOCK" ? "orders.confirm.retry" : "orders.confirm.action")}
            </Button>
          ) : null}
          {cancelable ? (
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              <Ban className="size-4" />
              {t("orders.actions.cancel")}
            </Button>
          ) : null}
        </div>
      </div>

      {order.cancellationRequestedAt ? (
        <Alert><AlertDescription>{t("orders.cancel.processing")}</AlertDescription></Alert>
      ) : null}
      {order.status === "PENDING_STOCK" ? <OrderShortages order={order} shortages={shortages} /> : null}

      {order.status === "CANCELED" && order.cancelReason ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t("orders.detail.canceledReason", { reason: order.cancelReason })}
          </AlertDescription>
        </Alert>
      ) : null}

      {order.dispatchGrantedAt ? <Alert><AlertDescription>{t("orders.lifecycle.dispatchGranted")}</AlertDescription></Alert> : null}
      <div className="grid gap-4 @min-[40rem]/order-detail:grid-cols-2 [&>*]:min-w-0">
        <OrderShipmentPanel orderId={order.id} />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("orders.detail.customer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <InfoRow label={t("orders.detail.name")}>{customer.name}</InfoRow>
              <InfoRow label={t("orders.detail.code")}>{customer.code}</InfoRow>
              {customer.taxCode ? (
                <InfoRow label={t("orders.detail.taxCode")}>{customer.taxCode}</InfoRow>
              ) : null}
              {customer.phone ? (
                <InfoRow label={t("orders.detail.phone")}>{customer.phone}</InfoRow>
              ) : null}
              {customer.email ? (
                <InfoRow label={t("orders.detail.email")}>{customer.email}</InfoRow>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("orders.detail.deliveryAddress")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              {address.recipientName ? (
                <InfoRow label={t("orders.detail.recipient")}>
                  {address.recipientName}
                </InfoRow>
              ) : null}
              {address.phone ? (
                <InfoRow label={t("orders.detail.phone")}>{address.phone}</InfoRow>
              ) : null}
              <InfoRow label={t("orders.detail.address")}>
                {formatAddressLine(address)}
              </InfoRow>
              {address.deliveryNote ? (
                <InfoRow label={t("orders.detail.deliveryNote")}>
                  {address.deliveryNote}
                </InfoRow>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("orders.detail.warehouse")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <InfoRow label={t("orders.detail.name")}>{warehouse.name}</InfoRow>
              <InfoRow label={t("orders.detail.code")}>{warehouse.code}</InfoRow>
              {warehouse.addressLine ? (
                <InfoRow label={t("orders.detail.address")}>
                  {formatAddressLine({ ...warehouse, addressLine: warehouse.addressLine })}
                </InfoRow>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("orders.detail.lines")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t("orders.detail.sku")}</TableHead>
                  <TableHead className="min-w-[200px]">{t("orders.form.lineProduct")}</TableHead>
                  <TableHead className="text-right">{t("orders.form.lineQuantity")}</TableHead>
                  <TableHead>{t("orders.form.lineUnit")}</TableHead>
                  <TableHead className="text-right">{t("orders.form.lineUnitWeight")}</TableHead>
                  <TableHead className="text-right">{t("orders.form.lineUnitVolume")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {line.lineNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{line.skuSnapshot}</TableCell>
                    <TableCell>{line.productNameSnapshot}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatDecimal(line.quantity, locale)}
                    </TableCell>
                    <TableCell className="text-xs">{line.unitSnapshot}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatDecimal(line.unitWeight, locale)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatDecimal(line.unitVolume, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{t("orders.detail.totalQuantity")}</dt>
              <dd className="font-mono text-base font-semibold">
                {formatDecimal(order.totalQuantity, locale)}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{t("orders.detail.totalWeight")}</dt>
              <dd className="font-mono text-base font-semibold">
                {formatDecimal(order.totalWeight, locale)}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{t("orders.detail.totalVolume")}</dt>
              <dd className="font-mono text-base font-semibold">
                {formatDecimal(order.totalVolume, locale)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("orders.timeline.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline entries={history} />
        </CardContent>
      </Card>

      <CancelOrderDialog
        order={order}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCanceled={() => {
          setCancelOpen(false);
          toast.success(t("orders.toast.canceled", { orderNumber: order.orderNumber }));
          reload();
        }}
        onConflict={() => {
          setCancelOpen(false);
          setConflictOpen(true);
        }}
        onFailure={(message) => {
          setCancelOpen(false);
          toast.error(message);
          reload();
        }}
      />
      {confirmOpen ? <ConfirmOrderDialog
        order={order}
        onClose={() => setConfirmOpen(false)}
        onConflict={showConflict}
        onConfirmed={(updated) => {
          setConfirmOpen(false);
          toast.success(t(updated.status === "CONFIRMED" ? "orders.confirm.success" : "orders.confirm.pending"));
          reload();
        }}
      /> : null}
      <VersionConflictDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        onReload={reload}
      />
    </div>
  );
}
