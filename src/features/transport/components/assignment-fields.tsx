"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  getDriverApi,
  getVehicleApi,
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
import { useTranslation } from "@/lib/i18n";

interface AssignmentFieldsProps {
  vehicleId: string | null;
  driverId: string | null;
  onVehicleChange: (id: string | null) => void;
  onDriverChange: (id: string | null) => void;
  disabled?: boolean;
  idPrefix: string;
}

export function AssignmentFields({
  vehicleId,
  driverId,
  onVehicleChange,
  onDriverChange,
  disabled = false,
  idPrefix,
}: AssignmentFieldsProps) {
  const { t } = useTranslation();
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [optionResult, setOptionResult] = useState<{
    key: string;
    vehicles: Vehicle[];
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
  const [retry, setRetry] = useState(0);
  const optionsKey = JSON.stringify([vehicleQuery, driverQuery, retry]);
  const optionData = optionResult?.key === optionsKey ? optionResult : null;
  const vehicles = optionData?.vehicles ?? [];
  const drivers = optionData?.drivers ?? [];
  const loading = optionData === null;
  const currentVehicle =
    currentVehicleResult?.id === vehicleId ? currentVehicleResult.value : null;
  const currentDriver =
    currentDriverResult?.id === driverId ? currentDriverResult.value : null;
  const failed =
    Boolean(optionData?.failed) ||
    (Boolean(vehicleId) &&
      currentVehicleResult?.id === vehicleId &&
      currentVehicleResult.value === null) ||
    (Boolean(driverId) &&
      currentDriverResult?.id === driverId &&
      currentDriverResult.value === null);

  useEffect(() => {
    let current = true;
    Promise.all([
      listVehiclesApi({
        q: vehicleQuery.trim() || undefined,
        status: "ACTIVE",
        page: 1,
        pageSize: 100,
      }),
      listDriversApi({
        q: driverQuery.trim() || undefined,
        status: "ACTIVE",
        page: 1,
        pageSize: 100,
      }),
    ])
      .then(([vehiclePage, driverPage]) => {
        if (current) {
          setOptionResult({
            key: optionsKey,
            vehicles: vehiclePage.items,
            drivers: driverPage.items,
            failed: false,
          });
        }
      })
      .catch(() => {
        if (current) {
          setOptionResult({
            key: optionsKey,
            vehicles: [],
            drivers: [],
            failed: true,
          });
        }
      });
    return () => {
      current = false;
    };
  }, [driverQuery, optionsKey, retry, vehicleQuery]);

  useEffect(() => {
    let current = true;
    if (!vehicleId) return;
    getVehicleApi(vehicleId)
      .then((value) => {
        if (current) setCurrentVehicleResult({ id: vehicleId, value });
      })
      .catch(() => {
        if (current) setCurrentVehicleResult({ id: vehicleId, value: null });
      });
    return () => {
      current = false;
    };
  }, [vehicleId, retry]);

  useEffect(() => {
    let current = true;
    if (!driverId) return;
    getDriverApi(driverId)
      .then((value) => {
        if (current) setCurrentDriverResult({ id: driverId, value });
      })
      .catch(() => {
        if (current) setCurrentDriverResult({ id: driverId, value: null });
      });
    return () => {
      current = false;
    };
  }, [driverId, retry]);

  const vehicleOptions = vehicles.some((item) => item.id === vehicleId)
    ? vehicles
    : currentVehicle && currentVehicle.id === vehicleId
      ? [currentVehicle, ...vehicles]
      : vehicles;
  const driverOptions = drivers.some((item) => item.id === driverId)
    ? drivers
    : currentDriver && currentDriver.id === driverId
      ? [currentDriver, ...drivers]
      : drivers;

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
          >
            <SelectValue placeholder={t("transport.fields.optional")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("transport.fields.unassigned")}</SelectItem>
            {vehicleOptions.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.code} · {vehicle.licensePlate}
              </SelectItem>
            ))}
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
          >
            <SelectValue placeholder={t("transport.fields.optional")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("transport.fields.unassigned")}</SelectItem>
            {driverOptions.map((driver) => (
              <SelectItem key={driver.id} value={driver.id}>
                {driver.code} · {driver.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
              {t("common.retry")}
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
