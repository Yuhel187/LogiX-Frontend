"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { isApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EntityLabel } from "@/components/shared/entity-label";
import { getShipmentApi, SHIPMENT_PERMISSIONS } from "@/features/shipments";
import type { StockMovement } from "../schemas/inventory.schema";

type ReferenceResult =
  | { number: string; state: "known" }
  | { state: "loading" | "unavailable" | "denied" | "failed" };

export function useMovementReferences(movements: StockMovement[]) {
  const { activeTenant, accessToken, hasPermission } = useAuth();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    scope: string;
    entries: Map<string, ReferenceResult>;
  } | null>(null);
  const allowed = hasPermission(SHIPMENT_PERMISSIONS.read);
  const ids = [
    ...new Set(
      movements
        .filter((item) => item.referenceType === "SHIPMENT")
        .map((item) => item.referenceId)
    ),
  ].sort();
  const idsKey = JSON.stringify(ids);
  const scope = JSON.stringify([
    activeTenant?.id,
    accessToken,
    allowed,
    idsKey,
    retry,
  ]);
  useEffect(() => {
    if (!allowed || !activeTenant?.id || !accessToken) return;
    const controller = new AbortController();
    const shipmentIds: string[] = JSON.parse(idsKey);
    Promise.all(
      shipmentIds.map(async (id): Promise<[string, ReferenceResult]> => {
        try {
          const shipment = await getShipmentApi(id, controller.signal);
          return [id, { state: "known", number: shipment.shipmentNumber }];
        } catch (error) {
          const state =
            isApiError(error) && error.status === 404
              ? "unavailable"
              : isApiError(error) &&
                  (error.status === 401 || error.status === 403)
                ? "denied"
                : "failed";
          return [id, { state }];
        }
      })
    ).then((entries) => {
      if (!controller.signal.aborted)
        setResult({ scope, entries: new Map(entries) });
    });
    return () => controller.abort();
  }, [scope, idsKey, allowed, activeTenant?.id, accessToken]);
  return {
    resolve(id: string): ReferenceResult {
      if (!allowed || !activeTenant || !accessToken) return { state: "denied" };
      return result?.scope === scope
        ? (result.entries.get(id) ?? { state: "unavailable" })
        : { state: "loading" };
    },
    retry: () => setRetry((value) => value + 1),
  };
}

export function MovementReference({
  movement,
  reference,
  retry,
}: {
  movement: StockMovement;
  reference: ReferenceResult;
  retry: () => void;
}) {
  const { t } = useTranslation();
  const number =
    movement.referenceType === "STOCK_RECEIPT"
      ? movement.referenceNumber
      : movement.referenceType === "SHIPMENT" && reference.state === "known"
        ? reference.number
        : null;
  const fallback =
    movement.referenceType === "MANUAL_ADJUSTMENT"
      ? t("displayLabels.manualAdjustment")
      : t(
          reference.state === "loading" && movement.referenceType === "SHIPMENT"
            ? "displayLabels.loading"
            : reference.state === "failed" &&
                movement.referenceType === "SHIPMENT"
              ? "displayLabels.referenceLoadError"
              : reference.state === "denied" &&
                  movement.referenceType === "SHIPMENT"
                ? "displayLabels.referenceDenied"
                : "displayLabels.unavailable"
        );
  return (
    <div className="min-w-0">
      <span>
        {t(`displayLabels.referenceTypes.${movement.referenceType}`)}:{" "}
      </span>
      <EntityLabel
        id={movement.referenceId}
        name={number}
        fallback={fallback}
        href={
          movement.referenceType === "SHIPMENT" && number
            ? `/shipments/${movement.referenceId}`
            : undefined
        }
      />
      {movement.referenceType === "SHIPMENT" && reference.state === "failed" ? (
        <Button variant="link" size="sm" onClick={retry}>
          {t("displayLabels.retry")}
        </Button>
      ) : null}
    </div>
  );
}
