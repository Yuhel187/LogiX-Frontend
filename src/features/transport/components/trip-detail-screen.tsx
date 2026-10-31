"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { TRANSPORT_PERMISSIONS } from "../constants/transport-permissions";
import {
  getTripApi,
  updateTripApi,
  assignTripApi,
} from "../api/trips.api";
import { useMutationIntent } from "../hooks/use-mutation-intent";
import type { TripDetail } from "../schemas/trip.schema";
import {
  assignTripSchema,
  updateTripSchema,
} from "../schemas/trip.schema";
import { tripError, tripOutcomeUnknown } from "../utils/trip-errors";
import { tripEditRecovery } from "../utils/mutation-intent";
import { AssignmentFields } from "./assignment-fields";
import { TripCancelDialog } from "./trip-cancel-dialog";
import { TripManifestPanel } from "./trip-manifest-panel";
import { TripStatusBadge } from "./trip-status-badge";
import { TripRoutePanel } from "./trip-route-panel";
import { TripDispatchDialog } from "./trip-dispatch-dialog";

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function fromLocalDateTime(value: string): string | null {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function hasRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

interface DraftMetadataProps {
  trip: TripDetail;
  tenantId: string;
  userId: string;
  canUpdate: boolean;
  disabled: boolean;
  onReload: () => void;
  onReadBack: (latest: TripDetail) => void;
}

function DraftMetadata({
  trip,
  tenantId,
  userId,
  canUpdate,
  disabled,
  onReload,
  onReadBack,
}: DraftMetadataProps) {
  const { t } = useTranslation();
  const scope = useMemo(() => ({ tenantId, userId }), [tenantId, userId]);
  const intent = useMutationIntent(scope, `trip:${trip.id}:metadata`);
  const [plannedStartAt, setPlannedStartAt] = useState("");
  const [unknownOutcome, setUnknownOutcome] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [readBack, setReadBack] = useState(false);

  useEffect(() => {
    if (!intent.ready || !intent.intent || !hasRecord(intent.intent.payload))
      return;
    let current = true;
    queueMicrotask(() => {
      if (!current || !intent.intent || !hasRecord(intent.intent.payload))
        return;
      const parsed = updateTripSchema.safeParse({
        requestId: intent.intent.requestId,
        ...intent.intent.payload,
      });
      if (parsed.success && parsed.data.plannedStartAt) {
        setPlannedStartAt(toLocalDateTime(parsed.data.plannedStartAt));
        setUnknownOutcome(true);
      }
    });
    return () => {
      current = false;
    };
  }, [intent.intent, intent.ready]);

  useEffect(() => {
    if (!intent.ready || intent.intent) return;
    let current = true;
    queueMicrotask(() => {
      if (!current) return;
      setPlannedStartAt(toLocalDateTime(trip.plannedStartAt));
      setUnknownOutcome(false);
    });
    return () => {
      current = false;
    };
  }, [intent.intent, intent.ready, trip.id, trip.plannedStartAt, trip.version]);

  const save = async () => {
    setError(null);
    setReadBack(false);
    if (!canUpdate || disabled || !intent.ready || intent.storageFailed) return;
    const isoDate = fromLocalDateTime(plannedStartAt);
    if (!isoDate) {
      setError(new Error("A valid planned start date is required."));
      return;
    }
    let requestId: string | null = null;
    try {
      setSaving(true);
      if (intent.intent && tripEditRecovery(intent.intent.payload) === "read-back") {
        const latest = await getTripApi(trip.id);
        intent.complete(intent.intent.requestId);
        setUnknownOutcome(false);
        setReadBack(true);
        onReadBack(latest);
        return;
      }
      const payload =
        intent.intent?.payload ?? {
          expectedVersion: trip.version,
          plannedStartAt: isoDate,
        };
      const saved = intent.begin(payload);
      requestId = saved.requestId;
      if (!hasRecord(payload)) {
        throw new Error("Saved trip update cannot be safely recovered.");
      }
      const input = updateTripSchema.parse({
        requestId: saved.requestId,
        ...payload,
      });
      await updateTripApi(trip.id, input);
      intent.complete(saved.requestId);
      setUnknownOutcome(false);
      onReload();
    } catch (reason: unknown) {
      setError(reason);
      if (tripOutcomeUnknown(reason)) {
        setUnknownOutcome(true);
      } else if (requestId) {
        intent.complete(requestId);
      }
    } finally {
      setSaving(false);
    }
  };

  const locked =
    disabled ||
    !canUpdate ||
    trip.status !== "DRAFT" ||
    Boolean(intent.intent) ||
    !intent.ready ||
    intent.storageFailed;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transport.detail.metadata")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xl space-y-2">
          <Label htmlFor="trip-detail-planned-start">
            {t("transport.fields.plannedStartAt")}
          </Label>
          <Input
            id="trip-detail-planned-start"
            type="datetime-local"
            value={plannedStartAt}
            onChange={(event) => setPlannedStartAt(event.target.value)}
            disabled={locked}
          />
        </div>
        {!canUpdate || trip.status !== "DRAFT" ? (
          <p className="text-xs text-muted-foreground">
            {t("transport.detail.readOnly")}
          </p>
        ) : null}
        {intent.storageFailed ? (
          <Alert variant="destructive">
            <AlertDescription>{t("transport.errors.intentStorage")}</AlertDescription>
          </Alert>
        ) : null}
        {intent.intent ? (
          <Alert role="status">
            <AlertDescription>
              {t(
                unknownOutcome
                  ? "transport.operations.localEditUnknown"
                  : "transport.operations.pending"
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        {readBack ? (
          <Alert role="status">
            <AlertDescription>{t("transport.operations.localEditReadBack")}</AlertDescription>
          </Alert>
        ) : null}
        {error !== null ? (
          <Alert variant="destructive">
            <AlertDescription>{tripError(error, t)}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          disabled={
            disabled ||
            !canUpdate ||
            trip.status !== "DRAFT" ||
            !intent.ready ||
            intent.storageFailed ||
            saving
          }
          onClick={() => void save()}
        >
          {saving ? (
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {intent.intent
            ? t("transport.actions.readLatest")
            : t("transport.actions.saveMetadata")}
        </Button>
      </CardContent>
    </Card>
  );
}

interface DraftAssignmentProps {
  trip: TripDetail;
  tenantId: string;
  userId: string;
  canUpdate: boolean;
  disabled: boolean;
  onReload: () => void;
  onReadBack: (latest: TripDetail) => void;
}

function DraftAssignment({
  trip,
  tenantId,
  userId,
  canUpdate,
  disabled,
  onReload,
  onReadBack,
}: DraftAssignmentProps) {
  const { t } = useTranslation();
  const scope = useMemo(() => ({ tenantId, userId }), [tenantId, userId]);
  const intent = useMutationIntent(scope, `trip:${trip.id}:assignment`);
  const [vehicleId, setVehicleId] = useState<string | null>(trip.vehicleId);
  const [driverId, setDriverId] = useState<string | null>(trip.driverId);
  const [unknownOutcome, setUnknownOutcome] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [readBack, setReadBack] = useState(false);
  const localRecovery = intent.intent
    ? assignTripSchema.safeParse({
        requestId: intent.intent.requestId,
        ...(hasRecord(intent.intent.payload) ? intent.intent.payload : {}),
      })
    : null;
  const needsReadBack =
    localRecovery?.success === true &&
    tripEditRecovery(localRecovery.data) === "read-back";

  useEffect(() => {
    if (!intent.ready || !intent.intent || !hasRecord(intent.intent.payload))
      return;
    let current = true;
    queueMicrotask(() => {
      if (!current || !intent.intent || !hasRecord(intent.intent.payload))
        return;
      const parsed = assignTripSchema.safeParse({
        requestId: intent.intent.requestId,
        ...intent.intent.payload,
      });
      if (parsed.success) {
        setVehicleId(parsed.data.vehicleId ?? null);
        if (parsed.data.driverId !== undefined) {
          setDriverId(parsed.data.driverId);
        }
        setUnknownOutcome(true);
      }
    });
    return () => {
      current = false;
    };
  }, [intent.intent, intent.ready]);

  useEffect(() => {
    if (!intent.ready || intent.intent) return;
    let current = true;
    queueMicrotask(() => {
      if (!current) return;
      setVehicleId(trip.vehicleId);
      setDriverId(trip.driverId);
      setUnknownOutcome(false);
    });
    return () => {
      current = false;
    };
  }, [intent.intent, intent.ready, trip.id, trip.vehicleId, trip.driverId, trip.version]);

  const save = async () => {
    setError(null);
    setReadBack(false);
    if (!canUpdate || disabled || !intent.ready || intent.storageFailed) return;
    let requestId: string | null = null;
    try {
      setSaving(true);
      if (needsReadBack && intent.intent) {
        const latest = await getTripApi(trip.id);
        intent.complete(intent.intent.requestId);
        setUnknownOutcome(false);
        setReadBack(true);
        onReadBack(latest);
        return;
      }
      const payload =
        intent.intent?.payload ?? {
          expectedVersion: trip.version,
          vehicleId,
          ...(driverId !== trip.driverId ? { driverId } : {}),
        };
      const saved = intent.begin(payload);
      requestId = saved.requestId;
      if (!hasRecord(payload)) {
        throw new Error("Saved assignment cannot be safely recovered.");
      }
      const input = assignTripSchema.parse({
        requestId: saved.requestId,
        ...payload,
      });
      await assignTripApi(trip.id, input);
      intent.complete(saved.requestId);
      setUnknownOutcome(false);
      onReload();
    } catch (reason: unknown) {
      setError(reason);
      if (tripOutcomeUnknown(reason)) {
        setUnknownOutcome(true);
      } else if (requestId) {
        intent.complete(requestId);
      }
    } finally {
      setSaving(false);
    }
  };

  const locked =
    disabled ||
    !canUpdate ||
    trip.status !== "DRAFT" ||
    Boolean(intent.intent) ||
    !intent.ready ||
    intent.storageFailed;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transport.detail.assignment")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AssignmentFields
          idPrefix={`trip-${trip.id}-assignment`}
          vehicleId={vehicleId}
          driverId={driverId}
          onVehicleChange={setVehicleId}
          onDriverChange={setDriverId}
          disabled={locked}
        />
        <p className="text-xs text-muted-foreground">
          {t("transport.detail.assignmentSnapshotNote")}
        </p>
        {!canUpdate || trip.status !== "DRAFT" ? (
          <p className="text-xs text-muted-foreground">
            {t("transport.detail.readOnly")}
          </p>
        ) : null}
        {intent.storageFailed ? (
          <Alert variant="destructive">
            <AlertDescription>{t("transport.errors.intentStorage")}</AlertDescription>
          </Alert>
        ) : null}
        {intent.intent ? (
          <Alert role="status">
            <AlertDescription>
              {t(
                unknownOutcome
                  ? needsReadBack
                    ? "transport.operations.localEditUnknown"
                    : "transport.operations.unknownOutcome"
                  : "transport.operations.pending"
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        {readBack ? (
          <Alert role="status">
            <AlertDescription>{t("transport.operations.localEditReadBack")}</AlertDescription>
          </Alert>
        ) : null}
        {error !== null ? (
          <Alert variant="destructive">
            <AlertDescription>{tripError(error, t)}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          disabled={
            disabled ||
            !canUpdate ||
            trip.status !== "DRAFT" ||
            !intent.ready ||
            intent.storageFailed ||
            saving
          }
          onClick={() => void save()}
        >
          {saving ? (
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {intent.intent
            ? t(needsReadBack
                ? "transport.actions.readLatest"
                : "transport.actions.retrySameRequest")
            : t("transport.actions.saveAssignment")}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TripAssignmentSummary({
  trip,
}: {
  trip: Pick<TripDetail, "vehicleId" | "driverId" | "vehicleSnapshot" | "driverSnapshot">;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transport.detail.assignment")}</CardTitle>
      </CardHeader>
      <CardContent className="grid min-w-0 grid-cols-1 gap-3 text-sm @container @min-[36rem]:grid-cols-2">
        <p className="min-w-0 break-words">
          <span className="text-muted-foreground">
            {t("transport.fields.vehicle")}:{" "}
          </span>
          {trip.vehicleSnapshot?.licensePlate ||
            trip.vehicleSnapshot?.code ||
            t(trip.vehicleId ? "displayLabels.unavailable" : "transport.fields.unassigned")}
        </p>
        <p className="min-w-0 break-words">
          <span className="text-muted-foreground">
            {t("transport.fields.driver")}:{" "}
          </span>
          {trip.driverSnapshot?.displayName ||
            trip.driverSnapshot?.code ||
            t(trip.driverId ? "displayLabels.unavailable" : "transport.fields.unassigned")}
        </p>
        <p className="col-span-full text-xs text-muted-foreground">
          {t("transport.detail.assignmentSnapshotNote")}
        </p>
      </CardContent>
    </Card>
  );
}

export function TripDetailScreen({ tripId }: { tripId: string }) {
  const { t, locale } = useTranslation();
  const { activeTenant, user, hasPermission } = useAuth();
  const router = useRouter();
  const tenantId = activeTenant?.id ?? "";
  const userId = user?.id ?? "";
  const scope = useMemo(() => ({ tenantId, userId }), [tenantId, userId]);
  const [loaded, setLoaded] = useState<{
    tripId: string;
    retry: number;
    data: TripDetail | null;
    error: unknown;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const [routeLocked, setRouteLocked] = useState(false);
  const [dispatchPending, setDispatchPending] = useState(false);
  const canUpdate = hasPermission(TRANSPORT_PERMISSIONS.tripUpdate);
  const canDispatch = hasPermission(TRANSPORT_PERMISSIONS.tripDispatch);

  useEffect(() => {
    const controller = new AbortController();
    getTripApi(tripId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setLoaded({ tripId, retry, data: result, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded((previous) => ({
            tripId,
            retry,
            data: previous?.tripId === tripId ? previous.data : null,
            error,
          }));
        }
      });
    return () => controller.abort();
  }, [retry, tripId]);

  const reload = useCallback(() => setRetry((value) => value + 1), []);
  const readBack = useCallback(
    (data: TripDetail) => setLoaded({ tripId, retry, data, error: null }),
    [tripId, retry]
  );
  const currentResult = loaded?.tripId === tripId ? loaded : null;
  const trip = currentResult?.data ?? null;
  const loadError =
    currentResult?.retry === retry ? currentResult.error : null;
  const loading =
    currentResult === null || currentResult.retry !== retry;

  if (loading && !trip) {
    return (
      <div className="mx-auto max-w-5xl space-y-4" role="status">
        <p className="sr-only">{t("transport.states.loadingTrip")}</p>
        <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
        <div className="h-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Alert variant="destructive" role="alert">
          <AlertDescription>{tripError(loadError, t)}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reload}>
            <RefreshCw aria-hidden="true" className="size-4" />
            {t("transport.actions.retry")}
          </Button>
          <Button variant="outline" onClick={() => router.push("/transport")}>
            {t("transport.actions.backToList")}
          </Button>
        </div>
      </div>
    );
  }

  const depot = trip.depotSnapshot;
  const refreshFailed = loading || loadError !== null;

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("transport.actions.backToList")}
            onClick={() => router.push("/transport")}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-all text-xl font-semibold">
                {trip.tripNumber}
              </h1>
              <TripStatusBadge status={trip.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("transport.detail.description")}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={reload} disabled={loading}>
          <RefreshCw
            aria-hidden="true"
            className={loading ? "size-4 animate-spin" : "size-4"}
          />
          {t("transport.actions.refresh")}
        </Button>
      </header>

      {loadError !== null ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {tripError(loadError, t)}
            <Button variant="outline" onClick={reload}>
              {t("transport.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid min-w-0 grid-cols-1 gap-4 @container @min-[36rem]:grid-cols-2 @min-[68rem]:grid-cols-4">
        <Card className="min-w-0 @min-[36rem]:col-span-2">
          <CardHeader>
            <CardTitle>{t("transport.detail.depotSnapshot")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="break-words font-medium">
              <span className="font-mono text-xs">{depot.code}</span>
              <span className="ml-2">{depot.name}</span>
            </p>
            <p className="break-words text-muted-foreground">
              {[depot.addressLine, depot.ward, depot.district, depot.province]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("transport.detail.snapshotVersion", {
                version: depot.version,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("transport.fields.plannedStartAt")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {formatDateTime(trip.plannedStartAt, locale)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("transport.detail.manifestTotal")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm tabular-nums">
            <p>
              {t("transport.fields.weight")}:{" "}
              {formatDecimal(trip.totalWeight, locale)}
            </p>
            <p>
              {t("transport.fields.volume")}:{" "}
              {formatDecimal(trip.totalVolume, locale)}
            </p>
          </CardContent>
        </Card>
      </section>

      {canUpdate && trip.status === "DRAFT" ? (
        <section className="grid min-w-0 grid-cols-1 gap-4 @container @min-[60rem]:grid-cols-2">
          <DraftMetadata
            trip={trip}
            tenantId={tenantId}
            userId={userId}
            canUpdate={canUpdate}
            disabled={refreshFailed || routeLocked}
            onReload={reload}
            onReadBack={readBack}
          />
          <DraftAssignment
            trip={trip}
            tenantId={tenantId}
            userId={userId}
            canUpdate={canUpdate}
            disabled={refreshFailed || routeLocked}
            onReload={reload}
            onReadBack={readBack}
          />
        </section>
      ) : (
        <TripAssignmentSummary trip={trip} />
      )}

      <TripRoutePanel
        trip={trip}
        scope={scope}
        disabled={refreshFailed}
        onReload={reload}
        onLockedChange={setRouteLocked}
      />
      <TripManifestPanel
        trip={trip}
        scope={scope}
        canUpdate={canUpdate && !refreshFailed && !routeLocked}
        onReload={reload}
      />
      <TripCancelDialog
        trip={trip}
        scope={scope}
        canUpdate={canUpdate && !refreshFailed && !routeLocked}
        dispatchPending={dispatchPending}
        onReload={reload}
      />
      <TripDispatchDialog
        trip={trip}
        scope={scope}
        canDispatch={canDispatch}
        disabled={refreshFailed || routeLocked}
        onReload={reload}
        onPendingChange={setDispatchPending}
      />
    </div>
  );
}
