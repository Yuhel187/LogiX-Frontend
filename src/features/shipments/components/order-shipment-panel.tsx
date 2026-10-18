"use client";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { listShipmentsApi } from "../api/shipments.api";
import { SHIPMENT_PERMISSIONS } from "../constants/shipment.constants";
import { useShipmentResource } from "../hooks/use-shipment-resource";
import { shipmentError } from "../utils/shipment-errors";
import { ShipmentStatusBadge } from "./shipment-status-badge";
function ShipmentLookup({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { data, error, loading, reload } = useShipmentResource(
    `order:${orderId}`,
    (signal) => listShipmentsApi({ orderId, page: 1, pageSize: 1 }, signal)
  );
  const shipment = data?.items[0];
  return (
    <>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {shipmentError(error.cause, t)}
            <Button variant="link" onClick={reload}>
              {t("shipments.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {!data && loading ? <Skeleton className="h-10 w-full" /> : null}
      {shipment ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/shipments/${shipment.id}`}
            className="break-all font-mono text-sm text-primary hover:underline"
          >
            {shipment.shipmentNumber}
          </Link>
          <ShipmentStatusBadge status={shipment.status} />
          {shipment.dispatchIntent?.status === "PENDING" ? (
            <p className="text-sm text-muted-foreground">
              {t("shipments.dispatch.processing")}
            </p>
          ) : null}
        </div>
      ) : data && !error ? (
        <p className="text-sm text-muted-foreground">
          {t("shipments.orderEmpty")}
        </p>
      ) : null}
    </>
  );
}
export function OrderShipmentPanel({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("shipments.orderPanel")}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasPermission(SHIPMENT_PERMISSIONS.read) ? (
          <ShipmentLookup orderId={orderId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("shipments.errors.forbidden")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
