"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { listVehiclesApi, setVehicleStatusApi } from "../../api/vehicles.api";
import type { Vehicle } from "../../schemas/vehicle.schema";
import { ResourcePage } from "../shared/resource-page";
import type {
  ResourceColumn,
  ResourceRowAction,
} from "../shared/resource-table";
import { StatusToggleDialog } from "../shared/status-toggle-dialog";
import { VehicleFormDialog } from "./vehicle-form-dialog";

export function VehiclesScreen() {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [statusTarget, setStatusTarget] = useState<Vehicle | null>(null);

  const columns: ResourceColumn<Vehicle>[] = [
    {
      key: "code",
      header: t("masterData.vehicle.code"),
      cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
      className: "w-36",
    },
    {
      key: "licensePlate",
      header: t("masterData.vehicle.licensePlate"),
      cell: (row) => <span className="font-medium">{row.licensePlate}</span>,
    },
    {
      key: "capacityWeight",
      header: t("masterData.vehicle.capacityWeight"),
      cell: (row) => <span className="tabular-nums">{row.capacityWeight}</span>,
      className: "w-40 text-right",
    },
    {
      key: "capacityVolume",
      header: t("masterData.vehicle.capacityVolume"),
      cell: (row) => <span className="tabular-nums">{row.capacityVolume}</span>,
      className: "w-40 text-right",
    },
  ];

  const buildActions = useCallback(
    (): ResourceRowAction<Vehicle>[] => [
      {
        label: t("common.edit"),
        onSelect: (row) => {
          setEditing(row);
          setFormOpen(true);
        },
      },
      {
        label: t("masterData.disable"),
        destructive: true,
        hidden: (row) => row.status !== "ACTIVE",
        onSelect: (row) => setStatusTarget(row),
      },
      {
        label: t("masterData.enable"),
        hidden: (row) => row.status !== "INACTIVE",
        onSelect: (row) => setStatusTarget(row),
      },
    ],
    [t]
  );

  return (
    <ResourcePage<Vehicle>
      title={t("masterData.vehicle.title")}
      description={t("masterData.vehicle.description")}
      searchPlaceholder={t("masterData.vehicle.searchPlaceholder")}
      emptyMessage={t("masterData.vehicle.empty")}
      createLabel={t("masterData.vehicle.create")}
      columns={columns}
      fetchPage={listVehiclesApi}
      buildActions={buildActions}
      onCreate={() => {
        setEditing(null);
        setFormOpen(true);
      }}
      renderDialogs={(reload) => (
        <>
          <VehicleFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            vehicle={editing}
            onSaved={reload}
          />
          <StatusToggleDialog
            target={statusTarget}
            onClear={() => setStatusTarget(null)}
            onConfirm={(row, action) => setVehicleStatusApi(row.id, action)}
            disableDescription={t("masterData.vehicle.disableDescription")}
            enableDescription={t("masterData.vehicle.enableDescription")}
            onDone={reload}
          />
        </>
      )}
    />
  );
}
