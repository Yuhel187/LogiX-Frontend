"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import {
  cancelTripApi,
  getTripOperationApi,
  previewCancelTripApi,
  replayCancelTripApi,
} from "../api/trips.api";
import { useMutationIntent } from "../hooks/use-mutation-intent";
import type { CancelPreview, TripDetail } from "../schemas/trip.schema";
import { cancelTripSchema, cancelTripReplaySchema } from "../schemas/trip.schema";
import type { MutationScope } from "../utils/mutation-intent";
import { tripError, tripOutcomeUnknown } from "../utils/trip-errors";

interface TripCancelDialogProps {
  trip: TripDetail;
  scope: MutationScope;
  canUpdate: boolean;
  dispatchPending?: boolean;
  onReload: () => void;
}

export function TripCancelDialog({
  trip,
  scope,
  canUpdate,
  dispatchPending = false,
  onReload,
}: TripCancelDialogProps) {
  const { t, locale } = useTranslation();
  const intent = useMutationIntent(scope, `trip:${trip.id}:cancel`);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<CancelPreview | null>(null);
  const [reason, setReason] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [unknownOutcome, setUnknownOutcome] = useState(false);
  const [clock, setClock] = useState(0);
  const previewExpired =
    preview !== null && clock > 0 && Date.parse(preview.expiresAt) <= clock;

  useEffect(() => {
    if (!preview) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [preview]);

  const canCancel =
    canUpdate &&
    (trip.status === "DRAFT" || trip.status === "APPROVED") &&
    !dispatchPending &&
    intent.ready &&
    !intent.storageFailed &&
    !intent.intent;

  const previewCancel = async () => {
    setError(null);
    setMessage("");
    if (!canCancel) return;
    setPreviewing(true);
    try {
      const result = await previewCancelTripApi(trip.id, {
        expectedVersion: trip.version,
      });
      setPreview(result);
      setReason("");
      setOpen(true);
    } catch (reason: unknown) {
      setError(reason);
    } finally {
      setPreviewing(false);
    }
  };

  const handleOperation = (operation: Awaited<ReturnType<typeof cancelTripApi>>) => {
    if (operation.status === "PENDING") {
      setMessage(t("transport.operations.pending"));
      setUnknownOutcome(false);
      setOpen(false);
      return;
    }
    intent.complete(operation.requestId);
    setOpen(false);
    setPreview(null);
    if (operation.status === "REJECTED") {
      setMessage(t("transport.operations.rejected"));
      setUnknownOutcome(false);
      return;
    }
    setMessage(t("transport.operations.completed"));
    setUnknownOutcome(false);
    onReload();
  };

  const confirmCancel = async () => {
    setError(null);
    if (!canUpdate || dispatchPending || !intent.ready || intent.storageFailed) return;

    let payload: unknown;
    if (intent.intent) {
      payload = intent.intent.payload;
    } else {
      if (!preview || previewExpired || preview.blockers.length > 0) return;
      if (Date.parse(preview.expiresAt) <= Date.now()) {
        setPreview(null);
        setError(new Error("Cancellation preview expired."));
        return;
      }
      payload = {
        expectedVersion: preview.expectedVersion,
        previewToken: preview.previewToken,
        confirmed: true,
        reason: reason.trim(),
      };
    }

    let requestId: string | null = null;
    try {
      const saved = intent.begin(payload);
      requestId = saved.requestId;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Saved cancellation cannot be safely recovered.");
      }
      const input = cancelTripReplaySchema.parse({
        requestId: saved.requestId,
        ...payload,
      });
      setSubmitting(true);
      handleOperation(
        await (intent.intent
          ? replayCancelTripApi(trip.id, input)
          : cancelTripApi(trip.id, cancelTripSchema.parse(input)))
      );
    } catch (reason: unknown) {
      setError(reason);
      if (tripOutcomeUnknown(reason)) {
        setUnknownOutcome(true);
        setMessage(t("transport.operations.unknownOutcome"));
        setOpen(false);
      } else if (requestId) {
        intent.complete(requestId);
        setPreview(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const recoverOperation = async () => {
    if (!intent.intent) return;
    setChecking(true);
    setError(null);
    try {
      const result = await getTripOperationApi(
        trip.id,
        intent.intent.requestId
      );
      if (result.status === "PENDING") {
        setMessage(t("transport.operations.pending"));
        setUnknownOutcome(false);
      } else {
        intent.complete(result.requestId);
        if (result.status === "COMPLETED") {
          setMessage(t("transport.operations.completed"));
          setUnknownOutcome(false);
          onReload();
        } else {
          setMessage(t("transport.operations.rejected"));
          setUnknownOutcome(false);
        }
      }
    } catch (reason: unknown) {
      setError(reason);
      setUnknownOutcome(true);
      setMessage(t("transport.operations.unknownOutcome"));
    } finally {
      setChecking(false);
    }
  };

  const title = t("transport.cancel.title");

  if (!canUpdate || (trip.status !== "DRAFT" && trip.status !== "APPROVED")) {
    return null;
  }

  return (
    <>
      <section className="space-y-3 rounded-lg border border-destructive/30 bg-card p-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {t("transport.cancel.description")}
          </p>
        </div>
        {intent.storageFailed ? (
          <Alert variant="destructive">
            <AlertDescription>{t("transport.errors.intentStorage")}</AlertDescription>
          </Alert>
        ) : null}
        {dispatchPending ? (
          <Alert role="status">
            <AlertDescription>{t("transport.dispatch.cancelAfterGrant")}</AlertDescription>
          </Alert>
        ) : null}
        {intent.intent ? (
          <Alert role="status">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {unknownOutcome
                  ? t("transport.operations.unknownOutcome")
                  : message || t("transport.operations.pending")}
              </span>
              <Button
                variant="outline"
                disabled={checking || submitting}
                onClick={() => void recoverOperation()}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={checking ? "size-4 animate-spin" : "size-4"}
                />
                {t("transport.actions.checkStatus")}
              </Button>
              {cancelTripReplaySchema.safeParse({
                requestId: intent.intent.requestId,
                ...(intent.intent.payload &&
                typeof intent.intent.payload === "object" &&
                !Array.isArray(intent.intent.payload)
                  ? intent.intent.payload
                  : {}),
              }).success ? (
                <Button
                  variant="outline"
                  disabled={checking || submitting}
                  onClick={() => void confirmCancel()}
                >
                  {t("transport.actions.retrySameRequest")}
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        {message && !intent.intent ? (
          <Alert role="status">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        {error !== null ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{tripError(error, t)}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          variant="destructive"
          disabled={!canCancel || previewing}
          onClick={() => void previewCancel()}
        >
          {previewing ? (
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {t("transport.cancel.preview")}
        </Button>
      </section>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!submitting) {
            setOpen(value);
            if (!value) setPreview(null);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {t("transport.cancel.confirmation")}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p>
                  {t("transport.cancel.previewSummary", {
                    shipments: preview.activeShipmentCount,
                    releases: preview.releaseCount,
                  })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("transport.cancel.previewExpiry", {
                    expiresAt: new Date(preview.expiresAt).toLocaleString(locale),
                  })}
                </p>
              </div>
              {preview.blockers.length ? (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>
                    {t("transport.cancel.blocked", {
                      count: preview.blockers.length,
                    })}
                  </AlertDescription>
                </Alert>
              ) : null}
              {previewExpired ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {t("transport.cancel.previewExpired")}
                  </AlertDescription>
                </Alert>
              ) : null}
              {error !== null ? (
                <Alert variant="destructive">
                  <AlertDescription>{tripError(error, t)}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="trip-cancel-reason">
                  {t("transport.cancel.reason")}
                </Label>
                <Textarea
                  id="trip-cancel-reason"
                  value={reason}
                  maxLength={1000}
                  rows={4}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={Boolean(intent.intent) || submitting}
                  aria-describedby="trip-cancel-reason-help"
                />
                <p
                  id="trip-cancel-reason-help"
                  className="text-xs text-muted-foreground"
                >
                  {t("transport.cancel.reasonHelp", {
                    count: reason.length,
                    max: 1000,
                  })}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={
                !preview ||
                previewExpired ||
                preview.blockers.length > 0 ||
                dispatchPending ||
                reason.trim().length === 0 ||
                reason.trim().length > 1000 ||
                Boolean(intent.intent) ||
                submitting ||
                !intent.ready ||
                intent.storageFailed
              }
              onClick={() => void confirmCancel()}
            >
              {submitting ? (
                <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t("transport.cancel.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
