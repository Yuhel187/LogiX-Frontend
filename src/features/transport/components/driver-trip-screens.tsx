"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  Info,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  Truck,
  User,
  Warehouse,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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
import {
  getCachedDrivers,
  listDriversApi,
  type Driver,
} from "@/features/master-data";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

function getStopDisplayLabel(
  stop: DriverTripStop,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (stop.shipmentNumber) {
    const stripped = stop.shipmentNumber.replace(/^SHP-?/i, "");
    if (!isUuid(stripped) && !isUuid(stop.shipmentNumber)) {
      return t("transport.driver.stopShipmentLabel", {
        shipmentNumber: stop.shipmentNumber,
      });
    }
  }
  if (stop.contact.recipientName) {
    return t("transport.driver.stopRecipientLabel", {
      recipient: stop.contact.recipientName,
    });
  }
  return t("transport.driver.stopSequenceLabel", {
    sequence: stop.approvedSequence,
  });
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variantClasses = useMemo(() => {
    switch (status) {
      case "IN_PROGRESS":
        return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium";
      case "COMPLETED":
      case "DELIVERED":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium";
      case "PENDING":
        return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium";
      case "FAILED":
      case "CANCELED":
        return "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium";
      default:
        return "border-muted bg-muted text-muted-foreground";
    }
  }, [status]);

  return (
    <Badge variant="outline" className={variantClasses}>
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
  const [debouncedDriverSearch, setDebouncedDriverSearch] = useState("");
  const [driverPages, setDriverPages] = useState(1);
  const [driversLoading, setDriversLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driversError, setDriversError] = useState<unknown>(null);

  useEffect(() => {
    const trimmed = driverSearch.trim();
    if (trimmed === debouncedDriverSearch) return;
    const timer = setTimeout(() => {
      setDebouncedDriverSearch(trimmed);
    }, 250);
    return () => clearTimeout(timer);
  }, [driverSearch, debouncedDriverSearch]);
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
    const params = {
      page: driverPage,
      pageSize: PAGE_SIZE,
      q: debouncedDriverSearch || undefined,
    };
    const request =
      !debouncedDriverSearch && driverPage === 1 && retry === 0
        ? getCachedDrivers(params)
        : listDriversApi(params);

    request
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
  }, [driverPage, debouncedDriverSearch, isSuperAdmin, retry]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("transport.driver.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("transport.driver.listDescription")}
          </p>
        </div>
        {isSuperAdmin && activeTenant?.name ? (
          <Badge variant="outline" className="self-start sm:self-auto py-1 px-3 text-xs font-normal">
            {t("transport.driver.adminTenant", {
              tenant: activeTenant.name,
            })}
          </Badge>
        ) : null}
      </header>

      {/* Scope and Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Touch-friendly Scope switcher for Mobile / Tablet / Desktop */}
          <div
            role="tablist"
            aria-label={t("transport.driver.tripScope")}
            className="inline-flex items-center rounded-xl border border-border/70 bg-muted/60 p-1 shadow-2xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={scope === "current"}
              onClick={() => {
                setScope("current");
                setPage(1);
              }}
              className={cn(
                "inline-flex min-h-[42px] items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                scope === "current"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock aria-hidden="true" className="size-4" />
              <span>{t("transport.driver.currentTrips")}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === "history"}
              onClick={() => {
                setScope("history");
                setPage(1);
              }}
              className={cn(
                "inline-flex min-h-[42px] items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                scope === "history"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <History aria-hidden="true" className="size-4" />
              <span>{t("transport.driver.tripHistory")}</span>
            </button>
          </div>
        </div>

        {/* Super Admin Driver Search and Filter - Only visible to Super Admin */}
        {isSuperAdmin ? (
          <section
            aria-label={t("transport.driver.filters")}
            className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border bg-card/60 p-4 shadow-xs sm:grid-cols-2"
          >
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="driver-search-input" className="text-xs font-medium text-muted-foreground">
                {t("masterData.driver.searchPlaceholder")}
              </Label>
              <Input
                id="driver-search-input"
                aria-label={t("masterData.driver.searchPlaceholder")}
                placeholder={t("masterData.driver.searchPlaceholder")}
                value={driverSearch}
                onChange={(event) => {
                  setDriverSearch(event.target.value);
                  setDriverPage(1);
                  setDriversLoading(true);
                }}
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="driver-trip-filter" className="text-xs font-medium text-muted-foreground">
                  {t("transport.driver.assignedDriver")}
                </Label>
                {driverPages > 1 ? (
                  <span className="text-xs text-muted-foreground">
                    {t("transport.driver.driverPageSummary", { page: driverPage, pages: driverPages })}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
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
                {driverPages > 1 ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      disabled={driversLoading || driverPage <= 1}
                      onClick={() => {
                        setDriversLoading(true);
                        setDriverPage((value) => value - 1);
                      }}
                      title={t("transport.actions.previous")}
                    >
                      ←
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      disabled={driversLoading || driversError !== null || driverPage >= driverPages}
                      onClick={() => {
                        setDriversLoading(true);
                        setDriverPage((value) => value + 1);
                      }}
                      title={t("transport.actions.next")}
                    >
                      →
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
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
              t("transport.driver.selectedDriver"),
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
        <div className="space-y-4" role="status" aria-label={t("transport.driver.loading")}>
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : current?.items.length ? (
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
  const driver = snapshotValue(trip.driverSnapshot, [
    "displayName",
    "name",
    "code",
  ]);

  const progressPercent =
    trip.stopCount > 0
      ? Math.round((trip.completedStopCount / trip.stopCount) * 100)
      : 0;

  return (
    <Card className="flex flex-col justify-between rounded-xl border bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="font-mono text-base font-semibold tracking-tight text-foreground">
              {trip.tripNumber}
            </span>
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Calendar aria-hidden="true" className="size-3.5 text-muted-foreground" />
              <span>
                {t("transport.driver.plannedStart", {
                  date: formatDateTime(trip.plannedStartAt, locale),
                })}
              </span>
            </CardDescription>
          </div>
          <StatusBadge status={trip.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <Truck aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">{t("transport.driver.vehicle")}</p>
              <p className="truncate font-medium text-foreground">{vehicle || t("transport.driver.notAvailable")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <User aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">{t("transport.driver.assignedDriver")}</p>
              <p className="truncate font-medium text-foreground">{driver || t("transport.driver.notAvailable")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t("transport.driver.progress", {
                completed: trip.completedStopCount,
                total: trip.stopCount,
              })}
            </span>
            <span className="font-semibold text-foreground">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="pt-2">
          <Button asChild className="w-full gap-2 font-medium">
            <Link href={`/driver/trips/${encodeURIComponent(trip.tripId)}`}>
              <span>{t("transport.driver.openTrip")}</span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>
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

  const completedCount = trip
    ? trip.stops.filter(
        (s) => s.status === "DELIVERED" || s.status === "FAILED",
      ).length
    : 0;
  const totalCount = trip ? trip.stops.length : 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="gap-1.5 min-h-[38px]" aria-label={t("transport.actions.backToList")}>
            <Link href="/driver/trips">
              <ArrowLeft aria-hidden="true" className="size-4" />
              <span>{t("transport.actions.back")}</span>
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {trip?.tripNumber
                  ? t("transport.driver.tripHeading", { tripNumber: trip.tripNumber })
                  : t("transport.driver.tripDetail")}
              </h1>
              {trip ? <StatusBadge status={trip.status} /> : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {trip?.plannedStartAt
                ? `${t("transport.driver.plannedStart", { date: formatDateTime(trip.plannedStartAt, locale) })} · ${t("transport.driver.detailDescription")}`
                : t("transport.driver.detailDescription")}
            </p>
          </div>
        </div>
        {isSuperAdmin && activeTenant?.name ? (
          <Badge variant="outline" className="self-start sm:self-auto py-1 px-3 text-xs font-normal">
            {t("transport.driver.adminTenant", {
              tenant: activeTenant.name,
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
        <div className="space-y-4" role="status" aria-label={t("transport.driver.loading")}>
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : trip ? (
        <>
          {/* Summary KPI Tiles */}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Warehouse aria-hidden="true" className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{t("transport.driver.warehouse")}</p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {snapshotValue(trip.depotSnapshot, ["name", "code"]) || t("transport.driver.notAvailable")}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Truck aria-hidden="true" className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{t("transport.driver.vehicle")}</p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {snapshotValue(trip.vehicleSnapshot, [
                      "licensePlate",
                      "plateNumber",
                      "registrationNumber",
                      "code",
                      "name",
                    ]) || t("transport.driver.notAvailable")}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <User aria-hidden="true" className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{t("transport.driver.assignedDriver")}</p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {snapshotValue(trip.driverSnapshot, [
                      "displayName",
                      "name",
                      "code",
                    ]) || t("transport.driver.notAvailable")}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 aria-hidden="true" className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">{t("transport.driver.progress", {
                      completed: completedCount,
                      total: totalCount,
                    })}</p>
                    <span className="text-xs font-bold text-foreground">{progressPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {isSuperAdmin ? (
            <Alert className="border-blue-500/20 bg-blue-500/5">
              <ShieldAlert className="size-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-200 font-semibold">{t("transport.driver.adminModeTitle")}</AlertTitle>
              <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
                {t("transport.driver.adminModeDescription", {
                  actor: user?.displayName ?? user?.email ?? "",
                })}
              </AlertDescription>
            </Alert>
          ) : null}

          {!canAct ? (
            <Alert>
              <Info className="size-4" />
              <AlertDescription className="text-xs">{t("transport.driver.readOnly")}</AlertDescription>
            </Alert>
          ) : null}

          <section className="space-y-4" aria-label={t("transport.driver.stopsTitle")}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">{t("transport.driver.stopsTitle")}</h2>
                <p className="text-xs text-muted-foreground">
                  {t("transport.driver.nextStopRule")}
                </p>
              </div>
              <Badge variant="secondary" className="self-start sm:self-auto text-xs">
                {t("transport.driver.totalStopsBadge", { count: trip.stops.length })}
              </Badge>
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

  const isPending = stop.status === "PENDING";
  const isDelivered = stop.status === "DELIVERED";
  const isFailed = stop.status === "FAILED";

  const cardBorderClass = isDelivered
    ? "border-emerald-500/30 bg-emerald-500/[0.015]"
    : isFailed
    ? "border-rose-500/30 bg-rose-500/[0.015]"
    : stop.isNext && isPending
    ? "border-primary ring-1 ring-primary/20 shadow-sm bg-primary/[0.01]"
    : "border-border";

  const stopLabel = getStopDisplayLabel(stop, t);

  return (
    <Card className={`rounded-xl transition-all ${cardBorderClass}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {stop.approvedSequence}
              </span>
              <span className="font-semibold text-foreground text-base">
                {t("transport.driver.stopTitle", {
                  sequence: stop.approvedSequence,
                })}
              </span>
              {stop.isNext && isPending ? (
                <Badge className="bg-primary text-primary-foreground text-xs font-medium animate-pulse">
                  {t("transport.driver.nextStop")}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm font-medium text-foreground/80">
              {stopLabel}
            </p>
          </div>
          <StatusBadge status={stop.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
          {/* Recipient info & Phone */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <User aria-hidden="true" className="size-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">
                {stop.contact.recipientName || t("transport.driver.recipientUnavailable")}
              </span>
            </div>
            {stop.contact.phone ? (
              <a
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors min-h-[36px]"
                href={`tel:${stop.contact.phone}`}
              >
                <Phone aria-hidden="true" className="size-3.5" />
                <span>{stop.contact.phone}</span>
              </a>
            ) : null}
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="leading-relaxed text-foreground/90">
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
          </div>

          {/* Delivery Note */}
          {stop.contact.deliveryNote ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Info aria-hidden="true" className="size-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{t("transport.driver.deliveryNoteLabel")}</span>
                <span>{stop.contact.deliveryNote}</span>
              </div>
            </div>
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

        {stop.isNext && isPending && trip.status !== "IN_PROGRESS" ? (
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground border border-border/50">
            <Info aria-hidden="true" className="size-4 shrink-0" />
            <span>{t("transport.driver.tripNotInProgress")}</span>
          </div>
        ) : null}

        {isPending && !stop.isNext ? (
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground border border-border/50">
            <Info aria-hidden="true" className="size-4 shrink-0" />
            <span>{t("transport.driver.nextStopOnly")}</span>
          </div>
        ) : null}

        {isDelivered ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
            <span>{t("transport.driver.stopDeliveredNote")}</span>
          </div>
        ) : null}

        {isFailed ? (
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-xs font-medium text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <XCircle aria-hidden="true" className="size-4 shrink-0" />
            <span>{t("transport.driver.stopFailedNote")}</span>
          </div>
        ) : null}

        {canSubmit && !unknown ? (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              size="lg"
              className="flex-1 h-12 min-h-[48px] text-sm sm:text-base gap-2 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-xs cursor-pointer"
              disabled={!intent.ready || intent.storageFailed}
              onClick={() => startAction("DELIVER")}
            >
              <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
              <span>{t("transport.driver.markDelivered")}</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12 min-h-[48px] text-sm sm:text-base gap-2 border-rose-400 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold cursor-pointer"
              disabled={!intent.ready || intent.storageFailed}
              onClick={() => startAction("FAIL")}
            >
              <XCircle aria-hidden="true" className="size-5 shrink-0" />
              <span>{t("transport.driver.markFailed")}</span>
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
                shipment: stopLabel,
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
