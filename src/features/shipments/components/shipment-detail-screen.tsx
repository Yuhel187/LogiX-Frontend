"use client";
import { ActorDirectory, ActorLabel } from "@/features/identity/client";
import { useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getShipmentApi } from "../api/shipments.api";
import { useShipmentResource } from "../hooks/use-shipment-resource";
import { shipmentActions } from "../utils/shipment-actions";
import { shipmentError } from "../utils/shipment-errors";
import type { ShipmentAction } from "../constants/shipment.constants";
import type {
  DispatchAttempt,
  ShipmentDetail,
} from "../schemas/shipment.schema";
import { ShipmentStatusBadge } from "./shipment-status-badge";
import { ShipmentActionDialog } from "./shipment-action-dialog";

export function ShipmentDetailScreen({ shipmentId }: { shipmentId: string }) {
  const { t, locale } = useTranslation();
  const { hasPermission } = useAuth();
  const [selection, setSelection] = useState<{
    action: ShipmentAction;
    shipment: ShipmentDetail;
    previousAttempt?: DispatchAttempt;
  } | null>(null);
  const [dispatchAttempt, setDispatchAttempt] =
    useState<DispatchAttempt | null>(null);
  const { data, error, loading, reload } = useShipmentResource(
    shipmentId,
    (signal) => getShipmentApi(shipmentId, signal),
    selection?.shipment.id !== shipmentId
  );
  if (!data)
    return error ? (
      <Alert variant="destructive" className="min-w-0">
        <AlertDescription className="space-y-3">
          <p>{shipmentError(error.cause, t)}</p>
          <Button onClick={reload}>{t("shipments.actions.retry")}</Button>
          <Button variant="link" asChild>
            <Link href="/shipments">{t("shipments.actions.back")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    ) : (
      <Skeleton className="h-80 w-full" />
    );
  const address = data.deliveryAddressSnapshot;
  const actions = shipmentActions(data, hasPermission);
  const pending = data.dispatchIntent?.status === "PENDING";
  return (
    <div className="min-w-0 space-y-5">
      <Link
        href="/shipments"
        className="text-sm text-muted-foreground hover:underline"
      >
        {t("shipments.actions.back")}
      </Link>
      <div className="flex flex-col justify-between gap-3 @min-[60rem]:flex-row">
        <div className="min-w-0 space-y-2">
          <h1 className="break-all font-mono text-xl font-semibold">
            {data.shipmentNumber}
          </h1>
          <ShipmentStatusBadge status={data.status} />
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button variant="outline" onClick={reload} disabled={loading}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            {t("shipments.actions.refresh")}
          </Button>
          {actions.map((action) => (
            <Button
              key={action}
              variant={action === "mark-failed" ? "destructive" : "default"}
              disabled={loading || !!error}
              onClick={() =>
                setSelection({
                  action,
                  shipment: data,
                  ...(action === "dispatch" &&
                    dispatchAttempt?.preview.shipmentId === shipmentId &&
                    data.dispatchIntent?.status !== "REJECTED" && {
                      previousAttempt: dispatchAttempt,
                    }),
                })
              }
            >
              {t(`shipments.actions.${action}`)}
            </Button>
          ))}
        </div>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{shipmentError(error.cause, t)}</AlertDescription>
        </Alert>
      ) : null}
      {pending ? (
        <Alert>
          <AlertDescription>
            {t("shipments.dispatch.processingDescription")}
          </AlertDescription>
        </Alert>
      ) : null}
      {data.dispatchIntent?.status === "REJECTED" ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t("shipments.dispatch.rejected")}
          </AlertDescription>
        </Alert>
      ) : null}
      {data.failureReason ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t("shipments.failureReason")}: {data.failureReason}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid min-w-0 gap-4 *:min-w-0 @min-[40rem]:grid-cols-2 @min-[64rem]:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("shipments.columns.order")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 break-words text-sm">
            <Link
              className="text-primary hover:underline"
              href={`/orders/${data.orderId}`}
            >
              {data.orderNumber}
            </Link>
            <p>
              {data.customerSnapshot.code} · {data.customerSnapshot.name}
            </p>
            <p className="text-muted-foreground">
              {t("shipments.columns.createdAt")}:{" "}
              {formatDateTime(data.createdAt, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("shipments.destination")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 break-words text-sm">
            <p>{address.recipientName}</p>
            {address.phone ? <p>{address.phone}</p> : null}
            <p>
              {[
                address.addressLine,
                address.ward,
                address.district,
                address.province,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            {address.deliveryNote ? (
              <p className="text-muted-foreground">{address.deliveryNote}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("shipments.columns.warehouse")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 break-words text-sm">
            <p>
              {data.warehouseSnapshot.code} · {data.warehouseSnapshot.name}
            </p>
            <p>
              {t("shipments.columns.weight")}:{" "}
              {formatDecimal(data.totalWeight, locale)}
            </p>
            <p>
              {t("shipments.columns.volume")}:{" "}
              {formatDecimal(data.totalVolume, locale)}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("shipments.items")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["sku", "product", "quantity", "unit", "weight", "volume"].map(
                  (key) => (
                    <TableHead key={key}>
                      {t(`shipments.columns.${key}`)}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-48 break-words whitespace-normal font-mono text-xs">
                    {item.skuSnapshot}
                  </TableCell>
                  <TableCell className="min-w-40 whitespace-normal">
                    {item.productNameSnapshot}
                  </TableCell>
                  <TableCell>{formatDecimal(item.quantity, locale)}</TableCell>
                  <TableCell>{item.unitSnapshot}</TableCell>
                  <TableCell>{formatDecimal(item.weight, locale)}</TableCell>
                  <TableCell>{formatDecimal(item.volume, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("shipments.history")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActorDirectory
            actorIds={data.statusHistory.map((entry) => entry.actorId)}
          >
            {(resolve) => (
              <ol className="space-y-4">
                {data.statusHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-border pl-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <ShipmentStatusBadge status={entry.toStatus} />
                      <time className="text-xs text-muted-foreground">
                        {formatDateTime(entry.occurredAt, locale)}
                      </time>
                    </div>
                    {entry.reason ? (
                      <p className="mt-1 break-words">{entry.reason}</p>
                    ) : null}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t("shipments.actor")}:{" "}
                      <ActorLabel
                        actorId={entry.actorId}
                        actor={resolve(entry.actorId)}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </ActorDirectory>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        {t("shipments.refreshHint")}
      </p>
      {selection?.shipment.id === shipmentId ? (
        <ShipmentActionDialog
          {...selection}
          onDispatchAttempt={setDispatchAttempt}
          onClose={() => {
            setSelection(null);
            reload();
          }}
          onReload={() => {
            setSelection(null);
            setDispatchAttempt(null);
            reload();
          }}
          onCompleted={(updated) => {
            setSelection(null);
            if (updated.dispatchIntent?.status !== "PENDING")
              setDispatchAttempt(null);
            if (updated.dispatchIntent?.status === "PENDING")
              toast.info(t("shipments.dispatch.processing"));
            else toast.success(t("shipments.saved"));
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
