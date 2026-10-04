"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { listWarehousesApi, setWarehouseStatusApi } from "../../api/warehouses.api";
import type { Warehouse } from "../../schemas/warehouse.schema";
import { ResourcePage } from "../shared/resource-page";
import type {
  ResourceColumn,
  ResourceRowAction,
} from "../shared/resource-table";
import { StatusToggleDialog } from "../shared/status-toggle-dialog";
import { WarehouseFormDialog } from "./warehouse-form-dialog";

export function WarehousesScreen() {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [statusTarget, setStatusTarget] = useState<Warehouse | null>(null);

  const columns: ResourceColumn<Warehouse>[] = [
    {
      key: "code",
      header: t("masterData.warehouse.code"),
      cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
      className: "w-36",
    },
    {
      key: "name",
      header: t("masterData.warehouse.name"),
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "address",
      header: t("masterData.address"),
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {[row.addressLine, row.ward, row.district, row.province]
            .filter(Boolean)
            .join(", ")}
        </span>
      ),
    },
  ];

  const buildActions = useCallback(
    (): ResourceRowAction<Warehouse>[] => [
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
    <ResourcePage<Warehouse>
      title={t("masterData.warehouse.title")}
      description={t("masterData.warehouse.description")}
      searchPlaceholder={t("masterData.warehouse.searchPlaceholder")}
      emptyMessage={t("masterData.warehouse.empty")}
      createLabel={t("masterData.warehouse.create")}
      columns={columns}
      fetchPage={listWarehousesApi}
      buildActions={buildActions}
      onCreate={() => {
        setEditing(null);
        setFormOpen(true);
      }}
      renderDialogs={(reload) => (
        <>
          <WarehouseFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            warehouse={editing}
            onSaved={reload}
          />
          <StatusToggleDialog
            target={statusTarget}
            onClear={() => setStatusTarget(null)}
            onConfirm={(row, action) => setWarehouseStatusApi(row.id, action)}
            disableDescription={t("masterData.warehouse.disableDescription")}
            enableDescription={t("masterData.warehouse.enableDescription")}
            onDone={reload}
          />
        </>
      )}
    />
  );
}
