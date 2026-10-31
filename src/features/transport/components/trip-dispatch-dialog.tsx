"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useTranslation } from "@/lib/i18n";
import {
  dispatchTripApi,
  getTripDispatchOperationApi,
  previewTripDispatchApi,
} from "../api/trips.api";
import { useMutationIntent } from "../hooks/use-mutation-intent";
import {
  dispatchCommandSchema,
  dispatchIntentPayloadSchema,
  type DispatchOperation,
  type DispatchPreview,
} from "../schemas/dispatch.schema";
import type { TripDetail } from "../schemas/trip.schema";
import type { MutationScope } from "../utils/mutation-intent";
import { tripError, tripOutcomeUnknown } from "../utils/trip-errors";

interface TripDispatchDialogProps {
  trip: TripDetail;
  scope: MutationScope;
  canDispatch: boolean;
  disabled: boolean;
  onReload: () => void;
  onPendingChange: (pending: boolean) => void;
}

export function TripDispatchDialog({
  trip,
  scope,
  canDispatch,
  disabled,
  onReload,
  onPendingChange,
}: TripDispatchDialogProps) {
  const { t, locale } = useTranslation();
  const intent = useMutationIntent(scope, `trip:${trip.id}:dispatch`);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<DispatchPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [unknownOutcome, setUnknownOutcome] = useState(false);
  const [clock, setClock] = useState(0);
  const previewExpired =
    preview !== null && clock > 0 && Date.parse(preview.expiresAt) <= clock;
  const savedPayload = useMemo(() => {
    if (!intent.intent) return null;
    const parsed = dispatchIntentPayloadSchema.safeParse(intent.intent.payload);
    return parsed.success ? parsed.data : null;
  }, [intent.intent]);

  useEffect(() => {
    if (!preview) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [preview]);

  useEffect(() => {
    if (intent.ready) onPendingChange(Boolean(intent.intent));
  }, [intent.intent, intent.ready, onPendingChange]);

  const available =
    canDispatch &&
    !disabled &&
    trip.status === "APPROVED" &&
    trip.approvedRoutePlanId !== null &&
    trip.approvedRoutePlanId !== undefined &&
    intent.ready &&
    !intent.storageFailed &&
    !intent.intent;

  const previewDispatch = async () => {
    setError(null);
    setMessage("");
    if (!available) return;
    setPreviewing(true);
    try {
      const result = await previewTripDispatchApi(trip.id, {
        version: trip.version,
      });
      setPreview(result);
      setOpen(true);
    } catch (reason: unknown) {
      setError(reason);
    } finally {
      setPreviewing(false);
    }
  };

  const handleOperation = (operation: DispatchOperation) => {
    if (operation.status === "PENDING") {
      setMessage(
        operation.stage === "RECEIPTED"
          ? t("transport.dispatch.granted")
          : t("transport.dispatch.pending")
      );
      setUnknownOutcome(false);
      setOpen(false);
      return;
    }

    intent.complete(operation.requestId);
    setOpen(false);
    setPreview(null);
    setUnknownOutcome(false);
    if (operation.status === "REJECTED") {
      setMessage(t("transport.dispatch.rejected"));
      return;
    }
    setMessage(t("transport.dispatch.committed"));
    onReload();
  };

  const submit = async () => {
    setError(null);
    setMessage("");
    setUnknownOutcome(false);
    if (!canDispatch || disabled || !intent.ready || intent.storageFailed) return;
    let requestId: string | null = null;
    try {
      let payload: unknown;
      if (intent.intent) {
        payload = intent.intent.payload;
      } else {
        if (!preview || previewExpired) return;
        if (Date.parse(preview.expiresAt) <= Date.now()) {
          setPreview(null);
          setError(new Error("Dispatch preview expired."));
          return;
        }
        payload = {
          version: preview.version,
          previewToken: preview.previewToken,
          confirmed: true,
        };
      }

      const saved = intent.begin(payload);
      requestId = saved.requestId;
      const parsedPayload = dispatchIntentPayloadSchema.parse(payload);
      const command = dispatchCommandSchema.parse({
        requestId: saved.requestId,
        ...parsedPayload,
      });
      setMessage(t("transport.dispatch.pending"));
      setSubmitting(true);
      handleOperation(await dispatchTripApi(trip.id, command));
    } catch (reason: unknown) {
      setError(reason);
      if (tripOutcomeUnknown(reason)) {
        setUnknownOutcome(true);
        setMessage(t("transport.dispatch.unknown"));
        setOpen(false);
      } else if (requestId) {
        intent.complete(requestId);
        setPreview(null);
        setOpen(false);
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
      handleOperation(
        await getTripDispatchOperationApi(trip.id, intent.intent.requestId)
      );
    } catch (reason: unknown) {
      setError(reason);
      setUnknownOutcome(true);
      setMessage(t("transport.dispatch.unknown"));
    } finally {
      setChecking(false);
    }
  };

  if (
    (!canDispatch && !intent.intent) ||
    (trip.status !== "APPROVED" && !intent.intent)
  ) {
    return null;
  }

  return (
    <>
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="font-semibold">{t("transport.dispatch.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("transport.dispatch.description")}
          </p>
        </div>
        <Alert>
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{t("transport.dispatch.warning")}</AlertDescription>
        </Alert>
        {intent.storageFailed ? (
          <Alert variant="destructive">
            <AlertDescription>{t("transport.errors.intentStorage")}</AlertDescription>
          </Alert>
        ) : null}
        {intent.intent ? (
          <Alert role="status">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {unknownOutcome || !message
                  ? t("transport.dispatch.unknown")
                  : message || t("transport.dispatch.pending")}
              </span>
              <Button
                variant="outline"
                disabled={checking || submitting || disabled}
                onClick={() => void recoverOperation()}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={checking ? "size-4 animate-spin" : "size-4"}
                />
                {t("transport.dispatch.checkStatus")}
              </Button>
              {savedPayload && canDispatch ? (
                <Button
                  variant="outline"
                  disabled={checking || submitting || disabled}
                  onClick={() => void submit()}
                >
                  {t("transport.dispatch.retrySameRequest")}
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
        {!intent.intent ? (
          <Button
            disabled={!available || previewing}
            onClick={() => void previewDispatch()}
          >
            {previewing ? (
              <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {t("transport.dispatch.preview")}
          </Button>
        ) : null}
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
            <DialogTitle>{t("transport.dispatch.title")}</DialogTitle>
            <DialogDescription>
              {t("transport.dispatch.confirmation")}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p>
                  {t("transport.dispatch.shipmentCount", {
                    count: preview.shipmentCount,
                  })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("transport.dispatch.previewExpiry", {
                    expiresAt: new Date(preview.expiresAt).toLocaleString(locale),
                  })}
                </p>
              </div>
              {previewExpired ? (
                <Alert variant="destructive">
                  <AlertDescription>{t("transport.errors.invalidRequest")}</AlertDescription>
                </Alert>
              ) : null}
              {error !== null ? (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{tripError(error, t)}</AlertDescription>
                </Alert>
              ) : null}
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
              disabled={
                !preview ||
                previewExpired ||
                Boolean(intent.intent) ||
                !canDispatch ||
                submitting ||
                !intent.ready ||
                intent.storageFailed ||
                disabled
              }
              onClick={() => void submit()}
            >
              {submitting ? (
                <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t("transport.dispatch.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
