"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  getWarehouseApi,
  WarehousePicker,
} from "@/features/master-data";
import type { Warehouse } from "@/features/master-data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { TRANSPORT_PERMISSIONS } from "../constants/transport-permissions";
import { createTripApi } from "../api/trips.api";
import { useMutationIntent } from "../hooks/use-mutation-intent";
import { createTripSchema } from "../schemas/trip.schema";
import { tripError, tripOutcomeUnknown } from "../utils/trip-errors";
import { AssignmentFields } from "./assignment-fields";

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function TripCreateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { activeTenant, user, hasPermission } = useAuth();
  const [warehouseId, setWarehouseId] = useState("");
  const [plannedStartAt, setPlannedStartAt] = useState("");
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [warehouseFailed, setWarehouseFailed] = useState(false);
  const [warehouseRetry, setWarehouseRetry] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [unknownOutcome, setUnknownOutcome] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldError, setFieldError] = useState("");

  const tenantId = activeTenant?.id ?? "";
  const userId = user?.id ?? "";
  const scope = useMemo(() => ({ tenantId, userId }), [tenantId, userId]);
  const intent = useMutationIntent(scope, "trip:create");
  const canCreate = hasPermission(TRANSPORT_PERMISSIONS.tripCreate);

  useEffect(() => {
    const savedIntent = intent.intent;
    if (!intent.ready || !savedIntent) return;
    let current = true;
    queueMicrotask(() => {
      if (!current) return;
      const payload = savedIntent.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        setError(new Error("Saved trip request cannot be safely restored."));
        return;
      }
      const saved = createTripSchema.safeParse({
        requestId: savedIntent.requestId,
        ...payload,
      });
      if (saved.success) {
        setWarehouseId(saved.data.warehouseId);
        setPlannedStartAt(toLocalDateTime(saved.data.plannedStartAt));
        setVehicleId(saved.data.vehicleId ?? null);
        setDriverId(saved.data.driverId ?? null);
        setUnknownOutcome(true);
      } else {
        setError(new Error("Saved trip request cannot be safely restored."));
      }
    });
    return () => {
      current = false;
    };
  }, [intent.intent, intent.ready]);

  useEffect(() => {
    if (!warehouseId) {
      return;
    }
    let current = true;
    getWarehouseApi(warehouseId)
      .then((value) => {
        if (current) {
          setWarehouse(value);
          setWarehouseFailed(false);
        }
      })
      .catch(() => {
        if (current) {
          setWarehouse(null);
          setWarehouseFailed(true);
        }
      });
    return () => {
      current = false;
    };
  }, [warehouseId, warehouseRetry]);

  const editable =
    canCreate &&
    intent.ready &&
    !intent.storageFailed &&
    !intent.intent &&
    !submitting;

  const submit = async () => {
    setError(null);
    setFieldError("");
    if (!canCreate) return;
    const startDate = new Date(plannedStartAt);
    if (
      !warehouseId ||
      !plannedStartAt ||
      !Number.isFinite(startDate.getTime())
    ) {
      setFieldError(t("transport.errors.requiredFields"));
      return;
    }

    const input = {
      warehouseId,
      plannedStartAt: startDate.toISOString(),
      vehicleId: vehicleId ?? undefined,
      driverId: driverId ?? undefined,
    };
    let savedRequestId: string | null = null;
    try {
      const saved = intent.begin(input);
      savedRequestId = saved.requestId;
      setSubmitting(true);
      const trip = await createTripApi({
        requestId: saved.requestId,
        ...input,
      });
      intent.complete(saved.requestId);
      router.push(`/transport/${encodeURIComponent(trip.id)}`);
    } catch (reason: unknown) {
      setError(reason);
      if (tripOutcomeUnknown(reason)) {
        setUnknownOutcome(true);
      } else if (savedRequestId) {
        intent.complete(savedRequestId);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-5">
      <header className="flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label={t("transport.actions.backToList")}
          onClick={() => router.push("/transport")}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{t("transport.create.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("transport.create.description")}
          </p>
        </div>
      </header>

      {intent.storageFailed ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{t("transport.errors.intentStorage")}</AlertDescription>
        </Alert>
      ) : null}
      {fieldError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{fieldError}</AlertDescription>
        </Alert>
      ) : null}
      {error !== null ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="space-y-2">
            <p>{tripError(error, t)}</p>
            {unknownOutcome ? (
              <p>{t("transport.operations.unknownOutcome")}</p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {unknownOutcome && intent.intent ? (
        <Alert role="status">
          <AlertDescription>
            {t("transport.operations.requestSaved")}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("transport.create.draftDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid min-w-0 grid-cols-1 gap-4 @container @min-[36rem]:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="trip-create-warehouse">
                {t("transport.fields.warehouse")} *
              </Label>
              <WarehousePicker
                id="trip-create-warehouse"
                value={warehouseId || undefined}
                onChange={(id) => {
                  setWarehouseId(id);
                  setWarehouse(null);
                }}
                placeholder={t("transport.fields.selectWarehouse")}
                disabled={!editable}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="trip-planned-start">
                {t("transport.fields.plannedStartAt")} *
              </Label>
              <Input
                id="trip-planned-start"
                type="datetime-local"
                value={plannedStartAt}
                onChange={(event) => setPlannedStartAt(event.target.value)}
                disabled={!editable}
                required
              />
            </div>
          </div>

          <AssignmentFields
            idPrefix="trip-create"
            vehicleId={vehicleId}
            driverId={driverId}
            onVehicleChange={setVehicleId}
            onDriverChange={setDriverId}
            disabled={!editable}
          />

          {warehouseFailed ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                {t("transport.errors.warehouseLoad")}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWarehouseRetry((value) => value + 1)}
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                  {t("transport.actions.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {warehouse ? (
            <section
              className="space-y-2 rounded-lg border bg-muted/30 p-4"
              aria-label={t("transport.create.depotPreview")}
            >
              <h2 className="text-sm font-medium">
                {t("transport.create.depotPreview")}
              </h2>
              <p className="text-sm">
                <span className="font-mono text-xs">{warehouse.code}</span>
                <span className="ml-2">{warehouse.name}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {[warehouse.addressLine, warehouse.ward, warehouse.district, warehouse.province]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("transport.create.snapshotNote")}
              </p>
            </section>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/transport")}
              disabled={submitting}
            >
              {t("transport.actions.backToList")}
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={
                !canCreate ||
                !intent.ready ||
                intent.storageFailed ||
                submitting ||
                (Boolean(intent.intent) && !unknownOutcome)
              }
            >
              {submitting ? (
                <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {unknownOutcome
                ? t("transport.actions.retrySameRequest")
                : t("transport.actions.create")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
