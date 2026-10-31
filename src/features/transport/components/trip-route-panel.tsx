"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DeliveryRouteMapWrapper, RouteSummaryPanel } from "@/features/routes";
import { useTranslation } from "@/lib/i18n";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { ActorDirectory } from "@/features/identity/client";
import { listRoutePlansApi, previewRouteApprovalApi } from "../api/routes.api";
import { TRANSPORT_PERMISSIONS } from "../constants/transport-permissions";
import { useRouteCommand } from "../hooks/use-route-command";
import type { TripDetail } from "../schemas/trip.schema";
import type { RouteApprovalPreview, RoutePlan } from "../schemas/route.schema";
import type { MutationScope } from "../utils/mutation-intent";
import { leafletGeometry, routeCoordinate, routePreviewUsable } from "../utils/route-draft";
import { tripError } from "../utils/trip-errors";
import { RouteStopOrder } from "./route-stop-order";

interface TripRoutePanelProps {
  trip: TripDetail;
  scope: MutationScope;
  disabled: boolean;
  onReload: () => void;
  onLockedChange: (locked: boolean) => void;
}

export function TripRoutePanel(props: TripRoutePanelProps) {
  const { hasPermission } = useAuth();
  if (!hasPermission(TRANSPORT_PERMISSIONS.routeRead)) return null;
  return <RouteWorkspace key={props.trip.id} {...props} />;
}

function RouteWorkspace({
  trip, scope, disabled, onReload, onLockedChange,
}: TripRoutePanelProps) {
  const { t, locale } = useTranslation();
  const { hasPermission } = useAuth();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ version: number; retry: number; plans: RoutePlan[]; error: unknown } | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<RouteApprovalPreview | null>(null);
  const [reopen, setReopen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const [now, setNow] = useState(0);
  const changed = useCallback(() => {
    setPreview(null);
    setReopen(false);
    setOrderedIds(null);
    setReason("");
    setRetry((value) => value + 1);
    onReload();
  }, [onReload]);
  const command = useRouteCommand(trip.id, scope, changed);
  const optimization = useRouteCommand(trip.id, scope, changed, "route-optimization");
  const canApprove = hasPermission(TRANSPORT_PERMISSIONS.routeApprove);
  const canOptimize = hasPermission(TRANSPORT_PERMISSIONS.routeOptimize);
  const canReopen = hasPermission(TRANSPORT_PERMISSIONS.tripUpdate);
  const plans = result?.plans ?? [];
  const loading = result === null || result.version !== trip.version || result.retry !== retry;
  const loadError = !loading ? result?.error : null;
  const selected = plans.find((plan) => plan.id === (selection ?? trip.approvedRoutePlanId)) ?? plans[0] ?? null;
  const activeStops = trip.stops.filter((stop) => !stop.deletedAt);
  const ids = orderedIds ?? selected?.stops.map((stop) => stop.tripStopId) ??
    activeStops.sort((a, b) => a.plannedSequence - b.plannedSequence).map((stop) => stop.id);
  const stops = ids.flatMap((id) => {
    const stop = activeStops.find((item) => item.id === id);
    return stop ? [{
      id, label: stop.addressSnapshot.recipientName,
      address: [stop.addressSnapshot.addressLine, stop.addressSnapshot.province].join(", "),
    }] : [];
  });
  const unsettled = trip.shipments.some((item) => item.state === "CLAIM_PENDING" || item.state === "RELEASE_PENDING");
  const editLocked = disabled || command.locked || loading || Boolean(loadError) ||
    trip.status !== "DRAFT" || unsettled || previewing || optimization.busy;
  const selectionChanged = selected !== null &&
    JSON.stringify(ids) !== JSON.stringify(selected.stops.map((stop) => stop.tripStopId));

  useEffect(() => {
    const controller = new AbortController();
    listRoutePlansApi(trip.id, controller.signal)
      .then(({ items }) => {
        if (!controller.signal.aborted) setResult({ version: trip.version, retry, plans: items, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ version: trip.version, retry, plans: [], error });
      });
    return () => controller.abort();
  }, [trip.id, trip.version, retry]);

  useEffect(() => {
    onLockedChange(command.locked || previewing || optimization.busy);
    return () => onLockedChange(false);
  }, [command.locked, previewing, optimization.busy, onLockedChange]);

  useEffect(() => {
    if (!preview) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [preview]);

  const map = useMemo(() => {
    if (!selected) return null;
    const snapshot = selected.inputSnapshot;
    const coordinates = routeCoordinate(snapshot.depot.latitude, snapshot.depot.longitude);
    if (!coordinates) return null;
    const points = selected.stops.map((item) => {
      const stop = snapshot.stops.find((point) => point.stopId === item.tripStopId);
      if (!stop) return null;
      const position = routeCoordinate(stop.addressSnapshot.latitude, stop.addressSnapshot.longitude);
      return position ? {
        id: stop.stopId, label: stop.addressSnapshot.recipientName,
        latitude: position[0], longitude: position[1],
      } : null;
    });
    if (points.some((point) => point === null)) return null;
    return {
      depot: { id: trip.warehouseId, label: snapshot.depot.name, latitude: coordinates[0], longitude: coordinates[1] },
      stops: points.filter((point) => point !== null),
      geometry: leafletGeometry(selected.metrics?.polyline ?? null),
    };
  }, [selected, trip.warehouseId]);

  async function loadPreview(override: boolean) {
    if (!selected || editLocked || !canApprove) return;
    setPreviewError(null);
    setPreviewing(true);
    try {
      const value = await previewRouteApprovalApi(trip.id, {
        expectedVersion: trip.version, planId: selected.id,
        planVersion: selected.planVersion, inputHash: selected.inputHash,
        ...(override ? { orderedStopIds: ids, reason: reason.trim() } : {}),
      });
      setNow(Date.now());
      setPreview(value);
    } catch (error: unknown) {
      setPreviewError(error);
    } finally {
      setPreviewing(false);
    }
  }
  const previewValid = routePreviewUsable(preview, trip.version, now);

  return (
    <Card>
      <CardHeader><CardTitle>{t("transport.route.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("transport.route.description")}</p>
        {loading ? <p role="status">{t("transport.route.loading")}</p> : null}
        {loadError || command.error || optimization.error || previewError ? (
          <Alert variant="destructive"><AlertDescription>
            {tripError(loadError ?? command.error ?? optimization.error ?? previewError, t)}
          </AlertDescription></Alert>
        ) : null}
        {command.message ? <Alert role="status"><AlertDescription>{t(command.message)}</AlertDescription></Alert> : null}
        {optimization.message ? <Alert role="status"><AlertDescription>{t(optimization.message)}</AlertDescription></Alert> : null}
        {optimization.intent.intent ? <Alert><AlertDescription className="space-y-2">
          <p>{t("transport.route.optimizerUnknown")}</p>
          <Button variant="outline" disabled={!canOptimize || optimization.busy || command.locked || !optimization.canRecover}
            onClick={() => void optimization.run()}>{t("transport.route.retry")}</Button>
        </AlertDescription></Alert> : null}
        {command.intent.storageFailed ? <Alert variant="destructive"><AlertDescription>{t("transport.errors.intentStorage")}</AlertDescription></Alert> : null}
        {command.intent.intent ? (
          <Alert><AlertDescription className="space-y-2">
            <p>{t("transport.route.unknown")}</p>
            {!command.canRecover ? <p>{t("transport.errors.intentStorage")}</p> : null}
            <Button variant="outline" disabled={command.busy || !command.canRecover ||
              (command.recoveryKind === "optimize" ? !canOptimize :
                command.recoveryKind === "reopen" ? !canReopen : !canApprove)}
              onClick={() => void command.run()}>
              {t(command.recoveryKind === "reopen" ? "transport.actions.readLatest" : "transport.route.retry")}
            </Button>
          </AlertDescription></Alert>
        ) : null}
        <Button variant="outline" disabled={loading || command.busy} onClick={() => setRetry((value) => value + 1)}>
          <RefreshCw className="size-4" aria-hidden="true" />{t("transport.actions.refresh")}
        </Button>
        {!loading && !loadError && plans.length === 0 ? <p className="text-sm">{t("transport.route.empty")}</p> : null}
        {plans.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor={`route-${trip.id}`}>{t("transport.route.versions")}</Label>
            <Select value={selected?.id ?? ""} disabled={command.locked || previewing}
              onValueChange={(id) => { setSelection(id); setOrderedIds(null); setPreview(null); setReason(""); }}>
              <SelectTrigger id={`route-${trip.id}`} className="w-full"><SelectValue placeholder={t("transport.route.select")} /></SelectTrigger>
              <SelectContent>{plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {t("transport.route.version", { version: plan.planVersion })} · {t(`transport.route.${plan.source}`)}
                </SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
        ) : null}
        {selected ? (
          <ActorDirectory actorIds={[selected.approvedBy]}>
            {(resolve) => {
              const actor = resolve(selected.approvedBy);
              return <RouteSummaryPanel selected={selected.id === trip.approvedRoutePlanId} route={{
                planVersion: selected.planVersion, source: selected.source,
                distanceKm: selected.totalDistance === null ? null : String(Number(selected.totalDistance) / 1_000),
                durationMinutes: selected.metrics?.total_duration_minutes === undefined ? null : String(selected.metrics.total_duration_minutes),
                approvedByLabel: selected.approvedBy === null ? null :
                  actor.kind === "known" ? actor.profile.displayName :
                    t(actor.kind === "loading" ? "displayLabels.loading" :
                      actor.kind === "failed" ? "displayLabels.actorLoadError" : "displayLabels.actorUnavailable"),
                approvedAt: selected.approvedAt,
                vehicleLabel: selected.vehicleSnapshot?.licensePlate ?? null,
                driverLabel: selected.driverSnapshot?.displayName ?? null,
              }} />;
            }}
          </ActorDirectory>
        ) : null}
        {selected ? map ? <DeliveryRouteMapWrapper {...map} label={t("transport.route.map")} /> :
          <p className="text-sm text-muted-foreground">{t("transport.route.noCoordinates")}</p> : null}
        <RouteStopOrder stops={stops} disabled={editLocked || !canApprove} onChange={(value) => { setOrderedIds(value); setPreview(null); }} />
        {trip.status === "DRAFT" ? (
          <div className="flex flex-wrap gap-2">
            {canApprove ? <Button disabled={editLocked || stops.length === 0}
              onClick={() => void command.run({ kind: "manual", input: { expectedTripVersion: trip.version, orderedStopIds: ids } })}>
              {t("transport.route.manual")}
            </Button> : null}
            {canOptimize ? <Button variant="outline" disabled={editLocked || optimization.locked || stops.length === 0}
              onClick={() => void optimization.run({ kind: "optimize", input: { expectedTripVersion: trip.version } })}>
              {t("transport.route.optimize")}
            </Button> : null}
            {canApprove ? <Button disabled={editLocked || !selected || selectionChanged}
              onClick={() => void loadPreview(false)}>{t("transport.route.preview")}</Button> : null}
          </div>
        ) : null}
        {trip.status === "DRAFT" && canApprove && selected ? (
          <div className="space-y-2">
            <Label htmlFor={`override-${trip.id}`}>{t("transport.route.reason")}</Label>
            <Textarea id={`override-${trip.id}`} value={reason} maxLength={1_000} disabled={editLocked}
              onChange={(event) => { setReason(event.target.value); setPreview(null); }} />
            <p className="text-xs text-muted-foreground">{t("transport.route.reasonHelp")}</p>
            <Button variant="outline" disabled={editLocked || !reason.trim() || !selectionChanged}
              onClick={() => void loadPreview(true)}>{t("transport.route.override")}</Button>
          </div>
        ) : null}
        {trip.status === "APPROVED" && canReopen ? (
          <Button variant="outline" disabled={disabled || command.locked} onClick={() => { setReason(""); setReopen(true); }}>
            {t("transport.route.reopen")}
          </Button>
        ) : null}
        <Dialog open={preview !== null} onOpenChange={(open) => { if (!open && !command.busy) setPreview(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("transport.route.preview")}</DialogTitle>
              <DialogDescription>{t("transport.route.confirmation")}</DialogDescription></DialogHeader>
            {preview ? <>
              <p className="break-words text-sm">{preview.vehicleSnapshot.licensePlate} · {preview.driverSnapshot.displayName}</p>
              <p className="text-sm">{t("transport.manifest.totals", {
                weight: formatDecimal(preview.totalWeight, locale), volume: formatDecimal(preview.totalVolume, locale),
              })}</p>
              {preview.reason ? <p className="break-words text-sm">{preview.reason}</p> : null}
              <p className="text-xs text-muted-foreground">{t("transport.route.expires", { time: formatDateTime(preview.expiresAt, locale) })}</p>
              {!previewValid ? <p role="alert" className="text-sm text-destructive">{t("transport.route.expired")}</p> : null}
            </> : null}
            {command.error ? <Alert variant="destructive"><AlertDescription>{tripError(command.error, t)}</AlertDescription></Alert> : null}
            <DialogFooter>
              <Button variant="outline" disabled={command.busy} onClick={() => setPreview(null)}>{t("transport.route.cancel")}</Button>
              <Button disabled={!previewValid || command.locked || disabled || !canApprove}
                onClick={() => {
                  if (!preview || !routePreviewUsable(preview, trip.version, Date.now())) return;
                  const input = { expectedVersion: preview.expectedVersion, planId: preview.planId,
                    planVersion: preview.planVersion, inputHash: preview.inputHash,
                    previewToken: preview.previewToken, confirmed: true as const };
                  void command.run(preview.action === "OVERRIDE" && preview.reason
                    ? { kind: "override", input: { ...input, orderedStopIds: preview.orderedStopIds, reason: preview.reason } }
                    : { kind: "approve", input });
                }}>{t("transport.route.confirm")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={reopen} onOpenChange={(open) => { if (!command.busy) setReopen(open); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("transport.route.reopen")}</DialogTitle>
              <DialogDescription>{t("transport.route.reopenConfirmation")}</DialogDescription></DialogHeader>
            <Label htmlFor={`reopen-${trip.id}`}>{t("transport.route.reopenReason")}</Label>
            <Textarea id={`reopen-${trip.id}`} maxLength={1_000} value={reason} disabled={command.busy}
              onChange={(event) => setReason(event.target.value)} />
            {command.error ? <Alert variant="destructive"><AlertDescription>{tripError(command.error, t)}</AlertDescription></Alert> : null}
            <DialogFooter><Button variant="outline" disabled={command.busy} onClick={() => setReopen(false)}>{t("transport.route.cancel")}</Button>
              <Button disabled={!reason.trim() || command.locked || disabled || !canReopen}
                onClick={() => void command.run({ kind: "reopen", input: { expectedVersion: trip.version, reason: reason.trim() } })}>
                {t("transport.route.confirmReopen")}
              </Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
