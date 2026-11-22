"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import {
  getCachedDriverById,
  getCachedDrivers,
  getCachedVehicleById,
  getCachedVehicles,
  listDriversApi,
  listVehiclesApi,
} from "@/features/master-data";
import type { Driver, Vehicle } from "@/features/master-data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDecimal } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { getTripResourceAvailabilityApi } from "../api/trips.api";
import type {
  BusyDriver,
  BusyVehicle,
  TripResourceAvailability,
} from "../schemas/trip.schema";

interface AssignmentFieldsProps {
  vehicleId: string | null;
  driverId: string | null;
  onVehicleChange: (id: string | null) => void;
  onDriverChange: (id: string | null) => void;
  disabled?: boolean;
  idPrefix: string;
  currentTripId?: string;
  requiredWeight?: string;
  requiredVolume?: string;
  onValidationChange?: (hasViolation: boolean) => void;
}

const SEARCH_DEBOUNCE_MS = 250;

function parseNumeric(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function AssignmentFields({
  vehicleId,
  driverId,
  onVehicleChange,
  onDriverChange,
  disabled = false,
  idPrefix,
  currentTripId,
  requiredWeight,
  requiredVolume,
  onValidationChange,
}: AssignmentFieldsProps) {
  const { t, locale } = useTranslation();
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [debouncedVehicleQuery, setDebouncedVehicleQuery] = useState("");
  const [debouncedDriverQuery, setDebouncedDriverQuery] = useState("");
  const [vehicleListResult, setVehicleListResult] = useState<{
    key: string;
    vehicles: Vehicle[];
    failed: boolean;
  } | null>(null);
  const [driverListResult, setDriverListResult] = useState<{
    key: string;
    drivers: Driver[];
    failed: boolean;
  } | null>(null);
  const [currentVehicleResult, setCurrentVehicleResult] = useState<{
    id: string;
    value: Vehicle | null;
  } | null>(null);
  const [currentDriverResult, setCurrentDriverResult] = useState<{
    id: string;
    value: Driver | null;
  } | null>(null);
  const [availabilityResult, setAvailabilityResult] = useState<{
    key: string;
    data: TripResourceAvailability | null;
    failed: boolean;
  } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const trimmed = vehicleQuery.trim();
    if (trimmed === debouncedVehicleQuery) return;
    const timer = setTimeout(() => {
      setDebouncedVehicleQuery(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [vehicleQuery, debouncedVehicleQuery]);

  useEffect(() => {
    const trimmed = driverQuery.trim();
    if (trimmed === debouncedDriverQuery) return;
    const timer = setTimeout(() => {
      setDebouncedDriverQuery(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [driverQuery, debouncedDriverQuery]);

  const vehicleKey = JSON.stringify([debouncedVehicleQuery, retry]);
  const driverKey = JSON.stringify([debouncedDriverQuery, retry]);
  const availabilityKey = JSON.stringify([currentTripId ?? null, retry]);
  const vehicleData =
    vehicleListResult?.key === vehicleKey ? vehicleListResult : null;
  const driverData =
    driverListResult?.key === driverKey ? driverListResult : null;
  const availabilityData =
    availabilityResult?.key === availabilityKey ? availabilityResult : null;
  const vehicles = useMemo(() => vehicleData?.vehicles ?? [], [vehicleData]);
  const drivers = useMemo(() => driverData?.drivers ?? [], [driverData]);
  const loading = vehicleData === null || driverData === null;
  const vehicleInList = Boolean(
    vehicleId && vehicles.some((item) => item.id === vehicleId)
  );
  const driverInList = Boolean(
    driverId && drivers.some((item) => item.id === driverId)
  );
  const currentVehicle =
    currentVehicleResult?.id === vehicleId ? currentVehicleResult.value : null;
  const currentDriver =
    currentDriverResult?.id === driverId ? currentDriverResult.value : null;
  const failed =
    Boolean(vehicleData?.failed) ||
    Boolean(driverData?.failed) ||
    (Boolean(vehicleId) &&
      !vehicleInList &&
      currentVehicleResult?.id === vehicleId &&
      currentVehicleResult.value === null) ||
    (Boolean(driverId) &&
      !driverInList &&
      currentDriverResult?.id === driverId &&
      currentDriverResult.value === null);

  useEffect(() => {
    const controller = new AbortController();
    getTripResourceAvailabilityApi(
      currentTripId ? { excludeTripId: currentTripId } : undefined,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setAvailabilityResult({ key: availabilityKey, data, failed: false });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAvailabilityResult({ key: availabilityKey, data: null, failed: true });
        }
      });
    return () => controller.abort();
  }, [availabilityKey, currentTripId]);

  useEffect(() => {
    let current = true;
    const params = {
      q: debouncedVehicleQuery || undefined,
      status: "ACTIVE" as const,
      page: 1,
      pageSize: 100,
    };
    const request =
      !debouncedVehicleQuery && retry === 0
        ? getCachedVehicles(params)
        : listVehiclesApi(params);

    request
      .then((vehiclePage) => {
        if (current) {
          setVehicleListResult({
            key: vehicleKey,
            vehicles: vehiclePage.items,
            failed: false,
          });
        }
      })
      .catch(() => {
        if (current) {
          setVehicleListResult({
            key: vehicleKey,
            vehicles: [],
            failed: true,
          });
        }
      });
    return () => {
      current = false;
    };
  }, [debouncedVehicleQuery, retry, vehicleKey]);

  useEffect(() => {
    let current = true;
    const params = {
      q: debouncedDriverQuery || undefined,
      status: "ACTIVE" as const,
      page: 1,
      pageSize: 100,
    };
    const request =
      !debouncedDriverQuery && retry === 0
        ? getCachedDrivers(params)
        : listDriversApi(params);

    request
      .then((driverPage) => {
        if (current) {
          setDriverListResult({
            key: driverKey,
            drivers: driverPage.items,
            failed: false,
          });
        }
      })
      .catch(() => {
        if (current) {
          setDriverListResult({
            key: driverKey,
            drivers: [],
            failed: true,
          });
        }
      });
    return () => {
      current = false;
    };
  }, [debouncedDriverQuery, driverKey, retry]);

  useEffect(() => {
    let current = true;
    if (!vehicleId || vehicleInList) return;
    getCachedVehicleById(vehicleId, { forceRefresh: retry > 0 })
      .then((value) => {
        if (current) setCurrentVehicleResult({ id: vehicleId, value });
      })
      .catch(() => {
        if (current) setCurrentVehicleResult({ id: vehicleId, value: null });
      });
    return () => {
      current = false;
    };
  }, [vehicleId, vehicleInList, retry]);

  useEffect(() => {
    let current = true;
    if (!driverId || driverInList) return;
    getCachedDriverById(driverId, { forceRefresh: retry > 0 })
      .then((value) => {
        if (current) setCurrentDriverResult({ id: driverId, value });
      })
      .catch(() => {
        if (current) setCurrentDriverResult({ id: driverId, value: null });
      });
    return () => {
      current = false;
    };
  }, [driverId, driverInList, retry]);

  const vehicleOptions = useMemo(
    () =>
      vehicles.some((item) => item.id === vehicleId)
        ? vehicles
        : currentVehicle && currentVehicle.id === vehicleId
          ? [currentVehicle, ...vehicles]
          : vehicles,
    [currentVehicle, vehicleId, vehicles],
  );
  const driverOptions = useMemo(
    () =>
      drivers.some((item) => item.id === driverId)
        ? drivers
        : currentDriver && currentDriver.id === driverId
          ? [currentDriver, ...drivers]
          : drivers,
    [currentDriver, driverId, drivers],
  );

  const busyDriverById = useMemo(() => {
    const map = new Map<string, BusyDriver>();
    for (const item of availabilityData?.data?.busyDrivers ?? []) {
      map.set(item.driverId, item);
    }
    return map;
  }, [availabilityData]);

  const busyVehicleById = useMemo(() => {
    const map = new Map<string, BusyVehicle>();
    for (const item of availabilityData?.data?.busyVehicles ?? []) {
      map.set(item.vehicleId, item);
    }
    return map;
  }, [availabilityData]);

  const neededWeight = parseNumeric(requiredWeight);
  const neededVolume = parseNumeric(requiredVolume);

  const selectedVehicle = useMemo(
    () => (vehicleId ? vehicleOptions.find((item) => item.id === vehicleId) ?? null : null),
    [vehicleId, vehicleOptions],
  );

  const selectedVehicleBusy = vehicleId ? busyVehicleById.get(vehicleId) ?? null : null;
  const selectedDriverBusy = driverId ? busyDriverById.get(driverId) ?? null : null;

  const weightExceeded =
    selectedVehicle !== null &&
    neededWeight > 0 &&
    neededWeight > parseNumeric(selectedVehicle.capacityWeight);
  const volumeExceeded =
    selectedVehicle !== null &&
    neededVolume > 0 &&
    neededVolume > parseNumeric(selectedVehicle.capacityVolume);
  const capacityExceeded = weightExceeded || volumeExceeded;

  const hasViolation = Boolean(
    selectedVehicleBusy || selectedDriverBusy || capacityExceeded,
  );

  useEffect(() => {
    onValidationChange?.(hasViolation);
  }, [hasViolation, onValidationChange]);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 @container @min-[36rem]:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Label htmlFor={`${idPrefix}-vehicle-search`}>
          {t("transport.fields.vehicle")}
        </Label>
        <Input
          id={`${idPrefix}-vehicle-search`}
          value={vehicleQuery}
          onChange={(event) => setVehicleQuery(event.target.value)}
          placeholder={t("transport.fields.vehicleSearch")}
          disabled={disabled}
        />
        <Select
          value={vehicleId ?? "none"}
          onValueChange={(value) =>
            onVehicleChange(value === "none" ? null : value)
          }
          disabled={disabled || loading || failed}
        >
          <SelectTrigger
            id={`${idPrefix}-vehicle`}
            className="w-full"
            aria-label={t("transport.fields.vehicle")}
            aria-invalid={Boolean(selectedVehicleBusy || capacityExceeded)}
          >
            <SelectValue placeholder={t("transport.fields.optional")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("transport.fields.unassigned")}</SelectItem>
            {vehicleOptions.map((vehicle) => {
              const busy = busyVehicleById.get(vehicle.id);
              const overWeight =
                neededWeight > 0 &&
                neededWeight > parseNumeric(vehicle.capacityWeight);
              const overVolume =
                neededVolume > 0 &&
                neededVolume > parseNumeric(vehicle.capacityVolume);
              const tags: string[] = [];
              if (busy) {
                tags.push(
                  t("transport.assignment.busyTag", { tripNumber: busy.tripNumber }),
                );
              }
              if (overWeight || overVolume) {
                tags.push(t("transport.assignment.insufficientCapacityTag"));
              }
              return (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.code} · {vehicle.licensePlate} (
                  {formatDecimal(vehicle.capacityWeight, locale)} kg ·{" "}
                  {formatDecimal(vehicle.capacityVolume, locale)} m³)
                  {tags.length > 0 ? ` — ${tags.join(" · ")}` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor={`${idPrefix}-driver-search`}>
          {t("transport.fields.driver")}
        </Label>
        <Input
          id={`${idPrefix}-driver-search`}
          value={driverQuery}
          onChange={(event) => setDriverQuery(event.target.value)}
          placeholder={t("transport.fields.driverSearch")}
          disabled={disabled}
        />
        <Select
          value={driverId ?? "none"}
          onValueChange={(value) =>
            onDriverChange(value === "none" ? null : value)
          }
          disabled={disabled || loading || failed}
        >
          <SelectTrigger
            id={`${idPrefix}-driver`}
            className="w-full"
            aria-label={t("transport.fields.driver")}
            aria-invalid={Boolean(selectedDriverBusy)}
          >
            <SelectValue placeholder={t("transport.fields.optional")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("transport.fields.unassigned")}</SelectItem>
            {driverOptions.map((driver) => {
              const busy = busyDriverById.get(driver.id);
              return (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.code} · {driver.displayName}
                  {busy
                    ? ` — ${t("transport.assignment.busyTag", { tripNumber: busy.tripNumber })}`
                    : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {selectedVehicleBusy ? (
        <Alert variant="destructive" role="alert" className="col-span-full">
          <AlertTriangle aria-hidden="true" className="size-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {t("transport.assignment.vehicleBusyViolation", {
                tripNumber: selectedVehicleBusy.tripNumber,
              })}
            </span>
            <Link
              href={`/transport/${encodeURIComponent(selectedVehicleBusy.tripId)}`}
              className="font-medium underline underline-offset-4"
            >
              {t("transport.assignment.viewBlockingTrip")}
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {selectedDriverBusy ? (
        <Alert variant="destructive" role="alert" className="col-span-full">
          <AlertTriangle aria-hidden="true" className="size-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {t("transport.assignment.driverBusyViolation", {
                tripNumber: selectedDriverBusy.tripNumber,
              })}
            </span>
            <Link
              href={`/transport/${encodeURIComponent(selectedDriverBusy.tripId)}`}
              className="font-medium underline underline-offset-4"
            >
              {t("transport.assignment.viewBlockingTrip")}
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {capacityExceeded && selectedVehicle ? (
        <Alert variant="destructive" role="alert" className="col-span-full">
          <AlertTriangle aria-hidden="true" className="size-4" />
          <AlertDescription>
            {t("transport.assignment.capacityViolation", {
              requiredWeight: formatDecimal(requiredWeight ?? "0", locale),
              capacityWeight: formatDecimal(selectedVehicle.capacityWeight, locale),
              requiredVolume: formatDecimal(requiredVolume ?? "0", locale),
              capacityVolume: formatDecimal(selectedVehicle.capacityVolume, locale),
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      {availabilityData?.failed ? (
        <Alert variant="destructive" className="col-span-full">
          <AlertCircle aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {t("transport.assignment.availabilityLoadError")}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRetry((value) => value + 1)}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              {t("transport.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {failed ? (
        <Alert variant="destructive" className="col-span-full">
          <AlertCircle aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {t("transport.errors.assignmentLoad")}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRetry((value) => value + 1)}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              {t("transport.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {loading ? (
        <p className="col-span-full text-xs text-muted-foreground" role="status">
          {t("transport.states.loadingAssignments")}
        </p>
      ) : null}
    </div>
  );
}
