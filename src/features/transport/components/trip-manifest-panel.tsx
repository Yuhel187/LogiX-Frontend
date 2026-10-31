"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDecimal } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import {
  addShipmentsApi,
  getTripOperationApi,
  listEligibleShipmentsApi,
  removeShipmentsApi,
} from "../api/trips.api";
import { useMutationIntent } from "../hooks/use-mutation-intent";
import type {
  EligibleShipment,
  ShipmentMembership,
  TripDetail,
  TripOperation,
} from "../schemas/trip.schema";
import {
  addShipmentsSchema,
  removeShipmentsSchema,
} from "../schemas/trip.schema";
import type { MutationScope } from "../utils/mutation-intent";
import { tripError, tripOutcomeUnknown } from "../utils/trip-errors";

type OperationKind = "add" | "remove";

interface TripManifestPanelProps {
  trip: TripDetail;
  scope: MutationScope;
  canUpdate: boolean;
  onReload: () => void;
}

export function TripManifestPanel({
  trip,
  scope,
  canUpdate,
  onReload,
}: TripManifestPanelProps) {
  const { t, locale } = useTranslation();
  const [page, setPage] = useState(1);
  const [poolResult, setPoolResult] = useState<{
    key: string;
    items: EligibleShipment[];
    total: number;
    error: unknown;
  } | null>(null);
  const [retryPool, setRetryPool] = useState(0);
  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [selectedMemberships, setSelectedMemberships] = useState<Set<string>>(
    new Set()
  );
  const [operationError, setOperationError] = useState<unknown>(null);
  const [operationMessage, setOperationMessage] = useState("");
  const [operationUnknown, setOperationUnknown] = useState(false);
  const [checking, setChecking] = useState<OperationKind | null>(null);
  const tripActive = trip.status === "DRAFT";
  const addIntent = useMutationIntent(
    scope,
    `trip:${trip.id}:membership:add`
  );
  const removeIntent = useMutationIntent(
    scope,
    `trip:${trip.id}:membership:remove`
  );
  const selectedShipments = useMemo(() => [...selected.entries()], [selected]);
  const selectedIds = useMemo(
    () => new Set(selectedShipments.map(([id]) => id)),
    [selectedShipments]
  );
  const activeMemberships = trip.shipments.filter(
    (membership) => membership.state === "ACTIVE"
  );
  const poolKey = `${trip.warehouseId}:${page}:${retryPool}`;
  const currentPool = poolResult?.key === poolKey ? poolResult : null;
  const eligible = currentPool?.items ?? [];
  const totalEligible = currentPool?.total ?? 0;
  const poolError = currentPool?.error ?? null;
  const loadingPool = tripActive && currentPool === null;
  const totalPages = Math.max(1, Math.ceil(totalEligible / 20));
  const isOperationPending =
    Boolean(addIntent.intent) || Boolean(removeIntent.intent);

  useEffect(() => {
    if (!tripActive) return;
    const controller = new AbortController();
    listEligibleShipmentsApi(
      { warehouseId: trip.warehouseId, page, pageSize: 20 },
      controller.signal
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setPoolResult({
            key: poolKey,
            items: result.items,
            total: result.total,
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setPoolResult({
            key: poolKey,
            items: [],
            total: 0,
            error,
          });
        }
      });
    return () => controller.abort();
  }, [page, poolKey, trip.warehouseId, tripActive]);

  const handleOperation = (
    kind: OperationKind,
    operation: TripOperation
  ) => {
    const activeIntent = kind === "add" ? addIntent : removeIntent;
    if (operation.status === "PENDING") {
      setOperationUnknown(false);
      setOperationMessage(t("transport.operations.pending"));
      return;
    }
    activeIntent.complete(operation.requestId);
    setOperationUnknown(false);
    if (operation.status === "REJECTED") {
      setOperationMessage(t("transport.operations.rejected"));
      setOperationError(null);
      return;
    }
    setOperationMessage(t("transport.operations.completed"));
    setOperationError(null);
    if (kind === "add") setSelected(new Map());
    if (kind === "remove") setSelectedMemberships(new Set());
    onReload();
  };

  const beginOperation = async (kind: OperationKind) => {
    setOperationError(null);
    setOperationMessage("");
    const activeIntent = kind === "add" ? addIntent : removeIntent;
    if (!activeIntent.ready || activeIntent.storageFailed) {
      setOperationError(new Error("Mutation intent storage is unavailable."));
      return;
    }

    let requestId: string | null = null;
    try {
      let payload: unknown;
      if (activeIntent.intent) {
        payload = activeIntent.intent.payload;
      } else if (kind === "add") {
        payload = {
          expectedTripVersion: trip.version,
          shipments: selectedShipments.map(([shipmentId, expectedShipmentVersion]) => ({
            shipmentId,
            expectedShipmentVersion,
          })),
        };
      } else {
        const shipmentIds = activeMemberships
          .filter((membership) => selectedMemberships.has(membership.id))
          .map((membership) => membership.shipmentId);
        payload = { expectedTripVersion: trip.version, shipmentIds };
      }
      const saved = activeIntent.begin(payload);
      requestId = saved.requestId;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Saved trip operation cannot be safely recovered.");
      }
      if (kind === "add") {
        const input = addShipmentsSchema.parse({
          requestId: saved.requestId,
          ...payload,
        });
        handleOperation(kind, await addShipmentsApi(trip.id, input));
      } else {
        const input = removeShipmentsSchema.parse({
          requestId: saved.requestId,
          ...payload,
        });
        handleOperation(kind, await removeShipmentsApi(trip.id, input));
      }
    } catch (error: unknown) {
      setOperationError(error);
      if (tripOutcomeUnknown(error)) {
        setOperationUnknown(true);
        setOperationMessage(t("transport.operations.unknownOutcome"));
      } else if (requestId) {
        activeIntent.complete(requestId);
      }
    }
  };

  const checkOperation = async (kind: OperationKind) => {
    const activeIntent = kind === "add" ? addIntent : removeIntent;
    if (!activeIntent.intent) return;
    setChecking(kind);
    setOperationError(null);
    try {
      const result = await getTripOperationApi(
        trip.id,
        activeIntent.intent.requestId
      );
      handleOperation(kind, result);
    } catch (error: unknown) {
      setOperationError(error);
      setOperationUnknown(true);
      setOperationMessage(t("transport.operations.unknownOutcome"));
    } finally {
      setChecking(null);
    }
  };

  const toggleShipment = (shipment: EligibleShipment, checked: boolean) => {
    setSelected((current) => {
      const next = new Map(current);
      if (checked) next.set(shipment.shipmentId, shipment.shipmentVersion);
      else next.delete(shipment.shipmentId);
      return next;
    });
  };

  const toggleMembership = (membership: ShipmentMembership, checked: boolean) => {
    setSelectedMemberships((current) => {
      const next = new Set(current);
      if (checked) next.add(membership.id);
      else next.delete(membership.id);
      return next;
    });
  };

  const recoverableOperation = addIntent.intent ? "add" : removeIntent.intent ? "remove" : null;
  const canAdd =
    tripActive &&
    canUpdate &&
    addIntent.ready &&
    !addIntent.storageFailed &&
    !isOperationPending &&
    selectedShipments.length > 0;
  const canRemove =
    tripActive &&
    canUpdate &&
    removeIntent.ready &&
    !removeIntent.storageFailed &&
    !isOperationPending &&
    selectedMemberships.size > 0;

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="trip-manifest-heading">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="trip-manifest-heading" className="text-lg font-semibold">
            {t("transport.manifest.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("transport.manifest.description")}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("transport.manifest.totals", {
            weight: formatDecimal(trip.totalWeight, locale),
            volume: formatDecimal(trip.totalVolume, locale),
          })}
        </p>
      </header>

      {addIntent.storageFailed || removeIntent.storageFailed ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{t("transport.errors.intentStorage")}</AlertDescription>
        </Alert>
      ) : null}
      {isOperationPending ? (
        <Alert role="status">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {operationUnknown
                ? t("transport.operations.unknownOutcome")
                : operationMessage || t("transport.operations.pending")}
            </span>
            {recoverableOperation ? (
              <Button
                variant="outline"
                disabled={checking !== null}
                onClick={() => void checkOperation(recoverableOperation)}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={checking ? "size-4 animate-spin" : "size-4"}
                />
                {t("transport.actions.checkStatus")}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {operationError !== null ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{tripError(operationError, t)}</AlertDescription>
        </Alert>
      ) : null}
      {operationMessage &&
      !isOperationPending &&
      operationError === null ? (
        <Alert role="status">
          <AlertDescription>{operationMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="min-w-0 overflow-x-auto rounded-lg border">
        <Table aria-label={t("transport.manifest.title")}>
          <TableHeader>
            <TableRow>
              <TableHead>{t("transport.columns.shipment")}</TableHead>
              <TableHead>{t("transport.fields.status")}</TableHead>
              <TableHead>{t("transport.fields.recipient")}</TableHead>
              <TableHead>{t("transport.fields.address")}</TableHead>
              <TableHead className="text-right">{t("transport.fields.weight")}</TableHead>
              <TableHead className="text-right">{t("transport.fields.volume")}</TableHead>
              <TableHead>{t("transport.fields.sequence")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trip.shipments.map((membership) => {
              const stop =
                trip.stops.find(
                  (item) =>
                    item.shipmentId === membership.shipmentId &&
                    item.deletedAt === null
                ) ??
                trip.stops.find((item) => item.shipmentId === membership.shipmentId);
              const snapshot = membership.shipmentSnapshot;
              const effective =
                membership.state === "ACTIVE" && stop?.deletedAt === null;
              return (
                <TableRow key={membership.id} className={!effective ? "opacity-70" : ""}>
                  <TableCell className="min-w-40">
                    <div className="flex items-center gap-2">
                      {effective && canUpdate ? (
                        <input
                          type="checkbox"
                          aria-label={t("transport.manifest.selectForRemoval", {
                            shipment: snapshot?.shipmentNumber ?? t("transport.manifest.snapshotUnavailable"),
                          })}
                          checked={selectedMemberships.has(membership.id)}
                          disabled={isOperationPending}
                          onChange={(event) =>
                            toggleMembership(membership, event.target.checked)
                          }
                          className="size-4 accent-primary"
                        />
                      ) : null}
                      <span className="font-medium">
                        {snapshot?.shipmentNumber ?? t("transport.manifest.snapshotUnavailable")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {t(`transport.membership.${membership.state}`)}
                    </span>
                  </TableCell>
                  <TableCell>{stop?.addressSnapshot.recipientName ?? "—"}</TableCell>
                  <TableCell className="min-w-52">
                    {stop
                      ? [
                          stop.addressSnapshot.addressLine,
                          stop.addressSnapshot.ward,
                          stop.addressSnapshot.district,
                          stop.addressSnapshot.province,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : t("transport.manifest.snapshotUnavailable")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDecimal(membership.weight, locale)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDecimal(membership.volume, locale)}
                  </TableCell>
                  <TableCell>
                    {stop?.plannedSequence ?? "—"}
                    {stop?.deletedAt ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t("transport.manifest.removed")}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
            {trip.shipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {t("transport.manifest.empty")}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        {canRemove ? (
          <div className="flex justify-end border-t p-3">
            <Button
              variant="outline"
              disabled={!canRemove}
              onClick={() => void beginOperation("remove")}
            >
              {t("transport.actions.removeSelected", {
                count: selectedMemberships.size,
              })}
            </Button>
          </div>
        ) : null}
      </div>

      {tripActive ? (
        <section className="min-w-0 space-y-3 rounded-lg border bg-card p-4">
          <header>
            <h3 className="font-semibold">{t("transport.manifest.addShipments")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("transport.manifest.poolDescription")}
            </p>
          </header>
          {poolError !== null ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                {tripError(poolError, t)}
                <Button
                  variant="outline"
                  onClick={() => setRetryPool((value) => value + 1)}
                >
                  {t("transport.actions.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {loadingPool ? (
            <div className="space-y-2" role="status">
              <span className="sr-only">{t("transport.states.loadingPool")}</span>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : eligible.length ? (
            <ul className="divide-y rounded-md border">
              {eligible.map((shipment) => (
                <li key={shipment.shipmentId} className="flex min-w-0 items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    aria-label={t("transport.manifest.selectShipment", {
                      shipment: shipment.shipmentNumber ?? t("transport.manifest.snapshotUnavailable"),
                    })}
                    checked={selectedIds.has(shipment.shipmentId)}
                    disabled={!canUpdate || isOperationPending}
                    onChange={(event) =>
                      toggleShipment(shipment, event.target.checked)
                    }
                    className="size-4 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium">
                      {shipment.shipmentNumber ?? t("transport.manifest.snapshotUnavailable")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("transport.manifest.demand", {
                        weight: formatDecimal(shipment.totalWeight, locale),
                        volume: formatDecimal(shipment.totalVolume, locale),
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : poolError === null ? (
            <p className="rounded-md border p-4 text-sm text-muted-foreground">
              {t("transport.manifest.poolEmpty")}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label>
              {t("transport.manifest.selectedCount", {
                count: selected.size,
                total: totalEligible,
              })}
            </Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || loadingPool}
                onClick={() => setPage((value) => value - 1)}
              >
                {t("transport.actions.previous")}
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages || loadingPool}
                onClick={() => setPage((value) => value + 1)}
              >
                {t("transport.actions.next")}
              </Button>
              <Button
                disabled={!canAdd || loadingPool}
                onClick={() => void beginOperation("add")}
              >
                {t("transport.actions.addSelected", {
                  count: selectedShipments.length,
                })}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {isOperationPending ? (
        <p className="break-all text-xs text-muted-foreground">
          {t("transport.operations.requestSaved")}
        </p>
      ) : null}
    </section>
  );
}
