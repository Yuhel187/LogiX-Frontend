"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WarehousePicker } from "@/features/master-data";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { TRANSPORT_PERMISSIONS } from "../constants/transport-permissions";
import { useTripListQuery } from "../hooks/use-trip-list-query";
import { listTripsApi } from "../api/trips.api";
import { tripError } from "../utils/trip-errors";
import { TripStatusBadge } from "./trip-status-badge";
import { AssignmentFields } from "./assignment-fields";
import { TRIP_STATUSES, type TripListParams } from "../schemas/trip.schema";

export function TripListScreen() {
  const { t, locale } = useTranslation();
  const { hasPermission } = useAuth();
  const query = useTripListQuery();
  const paramsKey = JSON.stringify(query.params);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data: Awaited<ReturnType<typeof listTripsApi>> | null;
    error: unknown;
  } | null>(null);
  const totalPages = result?.key === paramsKey && result.data
    ? Math.max(1, Math.ceil(result.data.total / result.data.pageSize))
    : 1;

  useEffect(() => {
    const controller = new AbortController();
    const key = paramsKey;
    const params = JSON.parse(paramsKey) as TripListParams;
    listTripsApi(params, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult((previous) => ({
            key,
            data: previous?.key === key ? previous.data : null,
            error,
          }));
        }
      });
    return () => controller.abort();
  }, [paramsKey, retry]);

  const trips = result?.key === paramsKey ? result.data?.items ?? null : null;
  const loadError = result?.key === paramsKey ? result.error : null;
  const loading = trips === null && loadError === null;
  const canCreate = hasPermission(TRANSPORT_PERMISSIONS.tripCreate);

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("transport.list.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("transport.list.description")}
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/transport/new">
              <Plus aria-hidden="true" className="size-4" />
              {t("transport.actions.create")}
            </Link>
          </Button>
        ) : null}
      </header>

      {query.invalid ? (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {t("transport.list.invalidQuery")}
            <Button variant="outline" size="sm" onClick={query.reset}>
              {t("transport.actions.resetFilters")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label={t("transport.list.filters")}
        className="grid min-w-0 grid-cols-1 gap-4 rounded-lg border bg-card p-4 @container @min-[36rem]:grid-cols-2 @min-[68rem]:grid-cols-4"
      >
        <div className="min-w-0 space-y-2">
          <Label htmlFor="trip-search">{t("transport.fields.search")}</Label>
          <Input
            id="trip-search"
            value={query.search}
            onChange={(event) => query.update({ search: event.target.value })}
            placeholder={t("transport.fields.searchPlaceholder")}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="trip-status">{t("transport.fields.status")}</Label>
          <Select
            value={query.status || "all"}
            onValueChange={(value) =>
              query.update({ status: value === "all" ? "" : value })
            }
          >
            <SelectTrigger id="trip-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("transport.fields.allStatuses")}</SelectItem>
              {TRIP_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`transport.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="trip-warehouse">{t("transport.fields.warehouse")}</Label>
          <WarehousePicker
            id="trip-warehouse"
            value={query.warehouseId || undefined}
            onChange={(id) => query.update({ warehouseId: id })}
            allowClear
            allLabel={t("transport.fields.allWarehouses")}
            placeholder={t("transport.fields.allWarehouses")}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="trip-from">{t("transport.fields.plannedStartFrom")}</Label>
          <Input
            id="trip-from"
            type="date"
            value={query.plannedStartFrom}
            max={query.plannedStartTo || undefined}
            onChange={(event) =>
              query.update({ plannedStartFrom: event.target.value })
            }
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="trip-to">{t("transport.fields.plannedStartTo")}</Label>
          <Input
            id="trip-to"
            type="date"
            value={query.plannedStartTo}
            min={query.plannedStartFrom || undefined}
            onChange={(event) =>
              query.update({ plannedStartTo: event.target.value })
            }
          />
        </div>
        <div className="col-span-full">
          <AssignmentFields
            idPrefix="trip-filter"
            vehicleId={query.vehicleId || null}
            driverId={query.driverId || null}
            onVehicleChange={(id) => query.update({ vehicleId: id ?? "" })}
            onDriverChange={(id) => query.update({ driverId: id ?? "" })}
          />
        </div>
        <div className="col-span-full flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={query.reset}>
            {t("transport.actions.resetFilters")}
          </Button>
        </div>
      </section>

      {loadError !== null ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {tripError(loadError, t)}
            <Button
              variant="outline"
              onClick={() => setRetry((value) => value + 1)}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              {t("transport.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="min-w-0 overflow-hidden rounded-lg border" aria-busy={loading}>
        {loading ? (
          <div className="space-y-3 p-4" role="status">
            <span className="sr-only">{t("transport.states.loadingList")}</span>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : trips?.length ? (
          <Table aria-label={t("transport.list.title")}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("transport.columns.trip")}</TableHead>
                <TableHead>{t("transport.fields.warehouse")}</TableHead>
                <TableHead>{t("transport.fields.status")}</TableHead>
                <TableHead>{t("transport.fields.plannedStartAt")}</TableHead>
                <TableHead className="text-right">{t("transport.fields.weight")}</TableHead>
                <TableHead className="text-right">{t("transport.fields.volume")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell>
                    <Link
                      href={`/transport/${encodeURIComponent(trip.id)}`}
                      className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {trip.tripNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="min-w-40">
                    <span className="font-mono text-xs">{trip.depotSnapshot.code}</span>
                    <span className="ml-2">{trip.depotSnapshot.name}</span>
                  </TableCell>
                  <TableCell>
                    <TripStatusBadge status={trip.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(trip.plannedStartAt, locale)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDecimal(trip.totalWeight, locale)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDecimal(trip.totalVolume, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : loadError === null ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {t("transport.list.empty")}
          </p>
        ) : null}
      </div>

      {result?.key === paramsKey && result.data ? (
        <nav
          className="flex flex-wrap items-center justify-between gap-3"
          aria-label={t("transport.list.pagination")}
        >
          <p className="text-sm text-muted-foreground">
            {t("transport.list.pageSummary", {
              page: result.data.page,
              pages: totalPages,
              total: result.data.total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={query.page <= 1 || loading}
              onClick={() => query.update({ page: String(query.page - 1) })}
            >
              {t("transport.actions.previous")}
            </Button>
            <Button
              variant="outline"
              disabled={query.page >= totalPages || loading}
              onClick={() => query.update({ page: String(query.page + 1) })}
            >
              {t("transport.actions.next")}
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
