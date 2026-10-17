"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { isApiError } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  commandShipmentApi,
  getDispatchPreviewApi,
} from "../api/shipments.api";
import type {
  DispatchAttempt,
  DispatchPreview,
  ShipmentDetail,
} from "../schemas/shipment.schema";
import {
  SHIPMENT_FAILURE_MAX_LENGTH,
  type ShipmentAction,
} from "../constants/shipment.constants";
import { shipmentError } from "../utils/shipment-errors";

interface Props {
  shipment: ShipmentDetail;
  action: ShipmentAction;
  previousAttempt?: DispatchAttempt;
  onDispatchAttempt: (attempt: DispatchAttempt) => void;
  onClose: () => void;
  onReload: () => void;
  onCompleted: (updated: ShipmentDetail) => void;
}
export function ShipmentActionDialog({
  shipment,
  action,
  previousAttempt,
  onDispatchAttempt,
  onClose,
  onReload,
  onCompleted,
}: Props) {
  const { t } = useTranslation();
  const [requestId] = useState(
    () => previousAttempt?.requestId ?? crypto.randomUUID()
  );
  const [preview, setPreview] = useState<DispatchPreview | null>(
    previousAttempt?.preview ?? null
  );
  const [failure, setFailure] = useState<unknown>(null);
  const [loading, setLoading] = useState(
    action === "dispatch" && !previousAttempt
  );
  const [attempt, setAttempt] = useState(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState(false);
  const submittingRef = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (action !== "dispatch" || previousAttempt) return;
    const controller = new AbortController();
    getDispatchPreviewApi(shipment.id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (
          result.shipmentId !== shipment.id ||
          result.orderId !== shipment.orderId ||
          result.reservationGroupId !== shipment.reservationGroupId ||
          result.version !== shipment.version
        ) {
          setConflict(true);
        } else setPreview(result);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setFailure(error);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [
    action,
    shipment.id,
    shipment.orderId,
    shipment.reservationGroupId,
    shipment.version,
    attempt,
    previousAttempt,
  ]);
  const submit = async () => {
    if (
      submittingRef.current ||
      loading ||
      conflict ||
      (action === "dispatch" && !preview) ||
      (action === "mark-failed" && !reason.trim())
    )
      return;
    submittingRef.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      if (action === "dispatch" && preview)
        onDispatchAttempt({ preview, requestId });
      const input =
        action === "dispatch" && preview
          ? {
              version: preview.version,
              orderVersion: preview.orderVersion,
              requestId,
              confirmed: true as const,
            }
          : {
              version: shipment.version,
              ...(["mark-delivered", "mark-failed"].includes(action) && {
                confirmed: true as const,
              }),
              ...(action === "mark-failed" && { reason: reason.trim() }),
            };
      const updated = await commandShipmentApi(shipment.id, action, input);
      if (mounted.current) onCompleted(updated);
    } catch (error) {
      if (mounted.current) {
        setFailure(error);
        if (isApiError(error) && error.status === 409) setConflict(true);
      }
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submittingRef.current) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`shipments.actions.${action}`)}</DialogTitle>
          <DialogDescription>
            {t(
              action === "dispatch"
                ? "shipments.dispatch.warning"
                : `shipments.confirmations.${action}`
            )}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            {t("shipments.columns.shipment")}
          </dt>
          <dd className="break-all font-mono">{shipment.shipmentNumber}</dd>
          <dt className="text-muted-foreground">
            {t("shipments.columns.order")}
          </dt>
          <dd className="break-all">{shipment.orderNumber}</dd>
          <dt className="text-muted-foreground">
            {t("shipments.columns.warehouse")}
          </dt>
          <dd className="min-w-0 break-words">{shipment.warehouseSnapshot.name}</dd>
        </dl>
        {loading ? (
          <p role="status" className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            {t("shipments.loading")}
          </p>
        ) : null}
        {preview ? (
          <p className="text-xs text-muted-foreground">
            {t("shipments.dispatch.versions", {
              shipment: preview.version,
              order: preview.orderVersion,
            })}
          </p>
        ) : null}
        {action === "mark-failed" ? (
          <div className="space-y-2">
            <Label htmlFor="shipment-failure-reason">
              {t("shipments.failureReason")}
            </Label>
            <Textarea
              id="shipment-failure-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={SHIPMENT_FAILURE_MAX_LENGTH}
              placeholder={t("shipments.failureReasonPlaceholder")}
              required
              disabled={submitting}
            />
          </div>
        ) : null}
        {action === "dispatch" ? (
          <Alert>
            <AlertDescription>
              {t("shipments.dispatch.unknownOutcome")}
            </AlertDescription>
          </Alert>
        ) : null}
        {conflict ? (
          <Alert variant="destructive">
            <AlertDescription>
              {t("shipments.errors.SHIPMENT_VERSION_CONFLICT")}
            </AlertDescription>
          </Alert>
        ) : null}
        {failure ? (
          <Alert variant="destructive">
            <AlertDescription>{shipmentError(failure, t)}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter className="flex-wrap">
          <Button variant="outline" disabled={submitting} onClick={onClose}>
            {t("shipments.actions.dismiss")}
          </Button>
          {conflict ? (
            <Button onClick={onReload}>{t("shipments.actions.reload")}</Button>
          ) : (
            <>
              {action === "dispatch" && !preview && !loading ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoading(true);
                    setFailure(null);
                    setAttempt((value) => value + 1);
                  }}
                >
                  {t("shipments.actions.retryPreview")}
                </Button>
              ) : null}
              <Button
                disabled={
                  submitting ||
                  loading ||
                  (action === "dispatch" && !preview) ||
                  (action === "mark-failed" && !reason.trim())
                }
                onClick={submit}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t(`shipments.actions.${action}`)}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
