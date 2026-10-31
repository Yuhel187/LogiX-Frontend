"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { listDriversApi, type Driver } from "@/features/master-data";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { z } from "zod";
import {
  deliverDriverTripStopApi,
  failDriverTripStopApi,
  getDriverTripApi,
  listDriverTripsApi,
  previewDriverTripActionApi,
} from "../api/driver-trips.api";
import { TRANSPORT_PERMISSIONS } from "../constants/transport-permissions";
import { useMutationIntent } from "../hooks/use-mutation-intent";
import {
  driverActionCommandInputSchema,
  type DriverAction,
  type DriverActionPreview,
  type DriverTripDetail,
  type DriverTripStop,
  type DriverTripSummary,
} from "../schemas/driver.schema";
import type { MutationScope } from "../utils/mutation-intent";
import { tripError, tripOutcomeUnknown } from "../utils/trip-errors";

const PAGE_SIZE = 20;
const savedDriverCommandSchema = z
  .object({
    action: z.enum(["DELIVER", "FAIL"]),
    command: driverActionCommandInputSchema.omit({ requestId: true }),
  })
  .strict();

function snapshotValue(
  snapshot: Record<string, unknown> | null,
  keys: string[],
): string | null {
  if (!snapshot) return null;
  for (const key of keys) {
    const value = snapshot[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const destructive = status === "FAILED" || status === "CANCELED";
  return (
    <Badge variant={destructive ? "destructive" : "secondary"}>
      {t(`transport.driver.status.${status}`)}
    </Badge>
  );
}

export function DriverTripListScreen() {
  const { t, locale } = useTranslation();
  const { activeTenant, isSuperAdmin } = useAuth();
  const [scope, setScope] = useState<"current" | "history">("current");
  const [driverId, setDriverId] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [driverPage, setDriverPage] = useState(1);
  const [driverSearch, setDriverSearch] = useState("");
  const [driverPages, setDriverPages] = useState(1);
  const [driversLoading, setDriversLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driversError, setDriversError] = useState<unknown>(null);
  const [result, setResult] = useState<{
    key: string;
    data: Awaited<ReturnType<typeof listDriverTripsApi>> | null;
    error: unknown;
  } | null>(null);
  const query = useMemo(
    () => ({
      scope,
      page,
      pageSize: PAGE_SIZE,
      ...(isSuperAdmin && driverId ? { driverId } : {}),
    }),
    [driverId, isSuperAdmin, page, scope],
  );
  const queryKey = JSON.stringify(query);
  const current = result?.key === queryKey ? result.data : null;
  const error = result?.key === queryKey ? result.error : null;
  const totalPages = current
    ? Math.max(1, Math.ceil(current.total / current.pageSize))
    : 1;

  useEffect(() => {
    const controller = new AbortController();
    listDriverTripsApi(query, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ key: queryKey, data, error: null });
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key: queryKey, data: null, error: reason });
        }
      });
    return () => controller.abort();
  }, [query, queryKey, retry]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const controller = new AbortController();
    listDriversApi({ page: driverPage, pageSize: PAGE_SIZE, q: driverSearch.trim() || undefined })
      .then((resultPage) => {
        if (!controller.signal.aborted) {
          setDrivers(resultPage.items);
          setDriverPages(Math.max(1, Math.ceil(resultPage.total / resultPage.pageSize)));
          setDriversLoading(false);
          setDriversError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setDriversError(reason);
          setDriversLoading(false);
        }
      });
    return () => controller.abort();
  }, [driverPage, driverSearch, isSuperAdmin, retry]);

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("transport.driver.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("transport.driver.listDescription")}
          </p>
        </div>
        {isSuperAdmin ? (
          <Badge variant="outline">
            {t("transport.driver.adminTenant", {
              tenant: activeTenant?.name ?? "",
            })}
          </Badge>
        ) : null}
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="driver-trip-scope">{t("transport.driver.tripScope")}</Label>
          <Select
            value={scope}
            onValueChange={(value: "current" | "history") => {
              setScope(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="driver-trip-scope" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">{t("transport.driver.currentTrips")}</SelectItem>
              <SelectItem value="history">{t("transport.driver.tripHistory")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isSuperAdmin ? (
          <div className="min-w-56 space-y-2">
            <Label htmlFor="driver-trip-filter">{t("transport.driver.assignedDriver")}</Label>
            <Input
              aria-label={t("masterData.driver.searchPlaceholder")}
              placeholder={t("masterData.driver.searchPlaceholder")}
              value={driverSearch}
              onChange={(event) => {
                setDriverSearch(event.target.value);
                setDriverPage(1);
                setDriversLoading(true);
              }}
            />
            <Select
              value={driverId || "all"}
              onValueChange={(value) => {
                setDriverId(value === "all" ? "" : value);
                setSelectedDriver(drivers?.find((driver) => driver.id === value) ?? null);
                setPage(1);
              }}
              disabled={!drivers || driversLoading}
            >
              <SelectTrigger id="driver-trip-filter" className="w-full">
                <SelectValue placeholder={t("transport.driver.allDrivers")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("transport.driver.allDrivers")}</SelectItem>
                {selectedDriver && !drivers?.some((driver) => driver.id === selectedDriver.id) ? (
                  <SelectItem value={selectedDriver.id}>
                    {selectedDriver.displayName} · {selectedDriver.code}
                  </SelectItem>
                ) : null}
                {drivers?.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.displayName} · {driver.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <nav className="flex items-center gap-2" aria-label={t("transport.driver.driverPagination")}>
              <Button variant="outline" disabled={driversLoading || driverPage <= 1}
                onClick={() => { setDriversLoading(true); setDriverPage((value) => value - 1); }}>
                {t("transport.actions.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("transport.driver.driverPageSummary", { page: driverPage, pages: driverPages })}
              </span>
              <Button variant="outline" disabled={driversLoading || driversError !== null || driverPage >= driverPages}
                onClick={() => { setDriversLoading(true); setDriverPage((value) => value + 1); }}>
                {t("transport.actions.next")}
              </Button>
            </nav>
          </div>
        ) : null}
      </div>

      {isSuperAdmin && driversError !== null ? (
        <Alert variant="destructive">
          <AlertTitle>{t("transport.driver.driverLookupError")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {tripError(driversError, t)}
            <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
              <RefreshCw aria-hidden="true" className="size-4" />
              {t("transport.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isSuperAdmin && driverId ? (
        <p className="text-sm text-muted-foreground">
          {t("transport.driver.filteredDriver", {
            driver:
              selectedDriver?.displayName ??
              driverId,
          })}
        </p>
      ) : null}

      {error !== null ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {tripError(error, t)}
            <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
              <RefreshCw aria-hidden="true" className="size-4" />
              {t("transport.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!current && error === null ? (
        <div className="space-y-3" role="status" aria-label={t("transport.driver.loading")}>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : current?.items.length ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
          {current.items.map((trip) => (
            <DriverTripCard
              key={trip.tripId}
              trip={trip}
              locale={locale}
            />
          ))}
        </div>
      ) : error === null ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("transport.driver.empty")}
          </CardContent>
        </Card>
      ) : null}

      {current ? (
        <nav
          className="flex flex-wrap items-center justify-between gap-3"
          aria-label={t("transport.driver.pagination")}
        >
          <p className="text-sm text-muted-foreground">
            {t("transport.driver.pageSummary", {
              page: current.page,
              pages: totalPages,
              total: current.total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              {t("transport.actions.previous")}
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              {t("transport.actions.next")}
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function DriverTripCard({
  trip,
  locale,
}: {
  trip: DriverTripSummary;
  locale: string;
}) {
  const { t } = useTranslation();
  const vehicle = snapshotValue(trip.vehicleSnapshot, [
    "licensePlate",
    "plateNumber",
    "registrationNumber",
    "code",
    "name",
  ]);
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{trip.tripNumber}</CardTitle>
            <CardDescription>
              {t("transport.driver.plannedStart", {
                date: formatDateTime(trip.plannedStartAt, locale),
              })}
            </CardDescription>
          </div>
          <StatusBadge status={trip.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            {t("transport.driver.progress", {
              completed: trip.completedStopCount,
              total: trip.stopCount,
            })}
          </p>
          {vehicle ? (
            <p className="inline-flex items-center gap-1">
              <Truck aria-hidden="true" className="size-4" />
              {vehicle}
            </p>
          ) : null}
        </div>
        <Button asChild>
          <Link href={`/driver/trips/${encodeURIComponent(trip.tripId)}`}>
            {t("transport.driver.openTrip")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function DriverTripDetailScreen({ tripId }: { tripId: string }) {
  const { t, locale } = useTranslation();
  const { user, activeTenant, isSuperAdmin, hasPermission } = useAuth();
  const [trip, setTrip] = useState<DriverTripDetail | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  const canAct =
    isSuperAdmin || hasPermission(TRANSPORT_PERMISSIONS.driverUpdate);
  const scope = useMemo<MutationScope | null>(
    () =>
      activeTenant?.id && user?.id
        ? { tenantId: activeTenant.id, userId: user.id }
        : null,
    [activeTenant, user],
  );

  useEffect(() => {
    const controller = new AbortController();
    getDriverTripApi(tripId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setTrip(result);
          setLoadError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setTrip(null);
          setLoadError(reason);
        }
      });
    return () => controller.abort();
  }, [retry, tripId]);

  const reload = () => setRetry((value) => value + 1);

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="icon" aria-label={t("transport.driver.backToTrips")}>
            <Link href="/driver/trips">
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {trip?.tripNumber ?? t("transport.driver.tripDetail")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("transport.driver.detailDescription")}
            </p>
          </div>
        </div>
        {isSuperAdmin ? (
          <Badge variant="outline">
            {t("transport.driver.adminTenant", {
              tenant: activeTenant?.name ?? "",
            })}
          </Badge>
        ) : null}
      </header>

      {loadError !== null ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {tripError(loadError, t)}
            <Button variant="outline" onClick={reload}>
              <RefreshCw aria-hidden="true" className="size-4" />
              {t("transport.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!trip && loadError === null ? (
        <div className="space-y-3" role="status" aria-label={t("transport.driver.loading")}>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : trip ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{t("transport.driver.tripSummary")}</CardTitle>
                <StatusBadge status={trip.status} />
              </div>
              <CardDescription>
                {t("transport.driver.plannedStart", {
                  date: formatDateTime(trip.plannedStartAt, locale),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SnapshotField
                label={t("transport.driver.warehouse")}
                value={snapshotValue(trip.depotSnapshot, ["name", "code"])}
              />
              <SnapshotField
                label={t("transport.driver.vehicle")}
                value={snapshotValue(trip.vehicleSnapshot, [
                  "licensePlate",
                  "plateNumber",
                  "registrationNumber",
                  "code",
                  "name",
                ])}
              />
              <SnapshotField
                label={t("transport.driver.assignedDriver")}
                value={snapshotValue(trip.driverSnapshot, [
                  "displayName",
                  "name",
                  "code",
                ])}
              />
              {isSuperAdmin ? (
                <SnapshotField
                  label={t("transport.driver.targetTenant")}
                  value={activeTenant?.name ?? null}
                />
              ) : null}
            </CardContent>
          </Card>

          {isSuperAdmin ? (
            <Alert>
              <AlertTitle>{t("transport.driver.adminModeTitle")}</AlertTitle>
              <AlertDescription>
                {t("transport.driver.adminModeDescription", {
                  actor: user?.displayName ?? user?.email ?? "",
                })}
              </AlertDescription>
            </Alert>
          ) : null}

          {!canAct ? (
            <Alert>
              <AlertDescription>{t("transport.driver.readOnly")}</AlertDescription>
            </Alert>
          ) : null}

          <section className="space-y-3" aria-label={t("transport.driver.stopsTitle")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t("transport.driver.stopsTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("transport.driver.nextStopRule")}
              </p>
            </div>
            {trip.stops.map((stop) => (
              <DriverStopCard
                key={`${stop.stopId}:${trip.version}:${stop.version}`}
                trip={trip}
                stop={stop}
                scope={scope}
                isSuperAdmin={isSuperAdmin}
                canAct={canAct}
                onReload={reload}
              />
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}

function SnapshotField({ label, value }: { label: string; value: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="break-words text-sm">{value || t("transport.driver.notAvailable")}</p>
    </div>
  );
}

function DriverStopCard({
  trip,
  stop,
  scope,
  isSuperAdmin,
  canAct,
  onReload,
}: {
  trip: DriverTripDetail;
  stop: DriverTripStop;
  scope: MutationScope | null;
  isSuperAdmin: boolean;
  canAct: boolean;
  onReload: () => void;
}) {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<DriverAction>("DELIVER");
  const [reason, setReason] = useState("");
  const [actingReason, setActingReason] = useState("");
  const [preview, setPreview] = useState<DriverActionPreview | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [receiptMessage, setReceiptMessage] = useState("");
  const intent = useMutationIntent(
    scope ?? { tenantId: "unavailable", userId: "unavailable" },
    `driver-trip:${trip.tripId}:stop:${stop.stopId}`,
  );
  const canSubmit =
    canAct &&
    trip.status === "IN_PROGRESS" &&
    stop.status === "PENDING" &&
    stop.isNext;
  const unknown = intent.intent !== null;

  const prepare = async () => {
    setError(null);
    setPreview(null);
    try {
      if (isSuperAdmin) {
        if (!actingReason.trim()) return;
        const input = {
          action,
          expectedTripVersion: trip.version,
          expectedStopVersion: stop.version,
          actingReason: actingReason.trim(),
          ...(action === "FAIL" ? { reason: reason.trim() } : {}),
        };
        const result = await previewDriverTripActionApi(
          trip.tripId,
          stop.stopId,
          input,
        );
        setPreview(result);
        setReviewed(true);
      } else {
        setReviewed(true);
      }
    } catch (cause: unknown) {
      setError(cause);
    }
  };

  const commandPayload = () =>
    driverActionCommandInputSchema.omit({ requestId: true }).parse({
      expectedTripVersion: trip.version,
      expectedStopVersion: stop.version,
      confirmed: true,
      ...(action === "FAIL" ? { reason: reason.trim() } : {}),
      ...(isSuperAdmin
        ? {
            previewToken: preview?.previewToken,
            actingReason: actingReason.trim(),
          }
        : {}),
    });

  const submit = async (savedRequest?: {
    requestId: string;
    payload: unknown;
  }) => {
    if (!scope || busy) return;
    setError(null);
    setBusy(true);
    let requestId = savedRequest?.requestId ?? null;
    try {
      let saved = savedRequest;
      if (!saved) {
        const payload = commandPayload();
          const created = intent.begin({ action, command: payload });
        requestId = created.requestId;
        saved = { requestId: created.requestId, payload: created.payload };
      }
        const savedCommand = savedDriverCommandSchema.parse(saved.payload);
        const command = driverActionCommandInputSchema.parse({
          requestId: saved.requestId,
          ...savedCommand.command,
        });
        const receipt =
          savedCommand.action === "DELIVER"
            ? await deliverDriverTripStopApi(
                trip.tripId,
                stop.stopId,
              command,
            )
          : await failDriverTripStopApi(trip.tripId, stop.stopId, command);
      intent.complete(saved.requestId);
      setReceiptMessage(
        t("transport.driver.actionCommitted", {
          status: t(`transport.driver.status.${receipt.status}`),
        }),
      );
      setOpen(false);
      toast.success(t("transport.driver.actionCommitted", {
        status: t(`transport.driver.status.${receipt.status}`),
      }));
      onReload();
    } catch (cause: unknown) {
      setError(cause);
      if (requestId && !tripOutcomeUnknown(cause)) {
        intent.complete(requestId);
        setPreview(null);
        setReviewed(false);
        setOpen(false);
        onReload();
        toast.error(tripError(cause, t));
      } else if (requestId) {
        setPreview(null);
        setReviewed(false);
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const startAction = (nextAction: DriverAction) => {
    setAction(nextAction);
    setReason("");
    setActingReason("");
    setPreview(null);
    setError(null);
    setReceiptMessage("");
    setOpen(true);
  };

  const savedPayload = intent.intent
    ? savedDriverCommandSchema.safeParse(intent.intent.payload)
    : null;

  return (
    <Card className={stop.isNext ? "border-primary/50" : ""}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {t("transport.driver.stopTitle", {
                sequence: stop.approvedSequence,
              })}
              {stop.isNext ? (
                <Badge>{t("transport.driver.nextStop")}</Badge>
              ) : null}
            </CardTitle>
            <CardDescription>
              {stop.shipmentNumber ??
                t("transport.driver.shipmentRef", { shipmentId: stop.shipmentId })}
            </CardDescription>
          </div>
          <StatusBadge status={stop.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <p className="font-medium">{stop.contact.recipientName || t("transport.driver.recipientUnavailable")}</p>
          <p className="inline-flex items-start gap-2 text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {[
                stop.contact.addressLine,
                stop.contact.ward,
                stop.contact.district,
                stop.contact.province,
                stop.contact.postalCode,
              ]
                .filter(Boolean)
                .join(", ") || t("transport.driver.addressUnavailable")}
            </span>
          </p>
          {stop.contact.phone ? (
            <a
              className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
              href={`tel:${stop.contact.phone}`}
            >
              <Phone aria-hidden="true" className="size-4" />
              {stop.contact.phone}
            </a>
          ) : null}
          {stop.contact.deliveryNote ? (
            <p className="rounded-md bg-muted/50 p-3 text-muted-foreground">
              {stop.contact.deliveryNote}
            </p>
          ) : null}
        </div>

        {receiptMessage ? (
          <Alert role="status">
            <AlertDescription>{receiptMessage}</AlertDescription>
          </Alert>
        ) : null}
        {intent.storageFailed ? (
          <Alert variant="destructive">
            <AlertDescription>{t("transport.errors.intentStorage")}</AlertDescription>
          </Alert>
        ) : null}
        {unknown ? (
          <Alert variant="destructive">
            <AlertTitle>{t("transport.driver.unknownOutcome")}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{t("transport.driver.unknownOutcomeHelp")}</p>
              {error !== null ? <p>{tripError(error, t)}</p> : null}
              {savedPayload?.success ? (
                <Button
                  variant="outline"
                  disabled={busy || !intent.ready}
                  onClick={() =>
                    submit({
                      requestId: intent.intent!.requestId,
                      payload: savedPayload.data,
                    })
                  }
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                  {t("transport.driver.retrySameRequest")}
                </Button>
              ) : (
                <p>{t("transport.driver.savedRequestInvalid")}</p>
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        {stop.isNext && stop.status === "PENDING" && trip.status !== "IN_PROGRESS" ? (
          <p className="text-sm text-muted-foreground">
            {t("transport.driver.tripNotInProgress")}
          </p>
        ) : null}
        {stop.status === "PENDING" && !stop.isNext ? (
          <p className="text-sm text-muted-foreground">
            {t("transport.driver.nextStopOnly")}
          </p>
        ) : null}
        {canSubmit && !unknown ? (
          <div className="flex flex-wrap gap-2">
            <Button disabled={!intent.ready || intent.storageFailed} onClick={() => startAction("DELIVER")}>
              {t("transport.driver.markDelivered")}
            </Button>
            <Button
              variant="outline"
              disabled={!intent.ready || intent.storageFailed}
              onClick={() => startAction("FAIL")}
            >
              {t("transport.driver.markFailed")}
            </Button>
          </div>
        ) : null}
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (busy) return;
          setOpen(nextOpen);
          if (!nextOpen) {
            setPreview(null);
            setReason("");
            setActingReason("");
            setError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("transport.driver.confirmActionTitle")}</DialogTitle>
            <DialogDescription>
              {t("transport.driver.confirmActionDescription", {
                action: t(`transport.driver.action.${action}`),
                shipment: stop.shipmentNumber ?? stop.shipmentId,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{stop.contact.recipientName || t("transport.driver.recipientUnavailable")}</p>
              <p className="mt-1 text-muted-foreground">
                {[stop.contact.addressLine, stop.contact.ward, stop.contact.district, stop.contact.province]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            {action === "FAIL" ? (
              <div className="space-y-2">
                <Label htmlFor={`driver-failure-reason-${stop.stopId}`}>
                  {t("transport.driver.failureReason")}
                </Label>
                <Textarea
                  id={`driver-failure-reason-${stop.stopId}`}
                  value={reason}
                  maxLength={1_000}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setPreview(null);
                    setReviewed(false);
                  }}
                  aria-invalid={!reason.trim()}
                  disabled={busy}
                />
              </div>
            ) : null}
            {isSuperAdmin ? (
              <div className="space-y-2">
                <Label htmlFor={`driver-acting-reason-${stop.stopId}`}>
                  {t("transport.driver.actingReason")}
                </Label>
                <Textarea
                  id={`driver-acting-reason-${stop.stopId}`}
                  value={actingReason}
                  maxLength={1_000}
                  onChange={(event) => {
                    setActingReason(event.target.value);
                    setPreview(null);
                    setReviewed(false);
                  }}
                  aria-invalid={!actingReason.trim()}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  {t("transport.driver.actingReasonHelp")}
                </p>
              </div>
            ) : null}

            {reviewed ? (
              <Alert>
                <AlertTitle>{t("transport.driver.previewTitle")}</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>
                    {t("transport.driver.stateChange", {
                      before: t("transport.driver.status.PENDING"),
                      after: t(`transport.driver.status.${action === "DELIVER" ? "DELIVERED" : "FAILED"}`),
                    })}
                  </p>
                  {isSuperAdmin && preview ? (
                    <p>
                      {t("transport.driver.previewExpires", {
                            date: formatDateTime(preview.expiresAt, locale),
                      })}
                    </p>
                  ) : null}
                  {preview?.reason ? (
                    <p>
                      {t("transport.driver.failureReason")}: {preview.reason}
                    </p>
                  ) : null}
                  {preview?.actingReason ? (
                    <p>
                      {t("transport.driver.actingReason")}: {preview.actingReason}
                    </p>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            {error !== null ? (
              <Alert variant="destructive">
                <AlertDescription>{tripError(error, t)}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            {!reviewed ? (
              <Button
                variant="outline"
                disabled={
                  busy ||
                  (action === "FAIL" && !reason.trim()) ||
                  (isSuperAdmin && !actingReason.trim())
                }
                onClick={prepare}
              >
                {isSuperAdmin
                  ? t("transport.driver.getPreview")
                  : t("transport.driver.reviewAction")}
              </Button>
            ) : (
              <Button
                disabled={busy || (action === "FAIL" && !reason.trim())}
                onClick={() => submit()}
              >
                {busy ? t("transport.driver.submitting") : t("transport.driver.confirmAction")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
