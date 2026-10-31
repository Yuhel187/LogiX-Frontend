"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { listDriversApi, setDriverStatusApi } from "../../api/drivers.api";
import { DRIVER_PERMISSIONS } from "../../constants/driver-permissions";
import type { Driver } from "../../schemas/driver.schema";
import { resolveDriverErrorMessage } from "../../utils/driver-error-message";
import { ResourcePage } from "../shared/resource-page";
import type {
  ResourceColumn,
  ResourceRowAction,
} from "../shared/resource-table";
import { StatusToggleDialog } from "../shared/status-toggle-dialog";
import { DriverFormDialog } from "./driver-form-dialog";
import { DriverRelinkDialog } from "./driver-relink-dialog";
import {
  isDriverConflictError,
  isUnknownDriverMutationOutcome,
} from "../../utils/driver-error-message";

export function DriversScreen() {
  const { locale, t } = useTranslation();
  const { hasPermission, activeTenant, accessToken, tenantTransition } = useAuth();
  const canManage = hasPermission(DRIVER_PERMISSIONS.manage);
  const canRelink = canManage && Boolean(activeTenant && accessToken) &&
    tenantTransition === "idle";
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [statusTarget, setStatusTarget] = useState<Driver | null>(null);
  const [relinkTarget, setRelinkTarget] = useState<Driver | null>(null);

  const columns: ResourceColumn<Driver>[] = [
    {
      key: "code",
      header: t("masterData.driver.code"),
      cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
      className: "w-32",
    },
    {
      key: "displayName",
      header: t("masterData.driver.name"),
      cell: (row) => <span className="font-medium">{row.displayName}</span>,
    },
    {
      key: "licenseNumber",
      header: t("masterData.driver.licenseNumber"),
      cell: (row) => <span className="font-mono text-xs">{row.licenseNumber}</span>,
    },
    {
      key: "licenseExpiry",
      header: t("masterData.driver.licenseExpiry"),
      cell: (row) => (
        <time dateTime={row.licenseExpiry}>
          {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
            new Date(`${row.licenseExpiry}T00:00:00`)
          )}
        </time>
      ),
    },
    {
      key: "phone",
      header: t("masterData.driver.phone"),
      cell: (row) => row.phone ?? "—",
    },
  ];

  const buildActions = useCallback(
    (): ResourceRowAction<Driver>[] =>
      canManage
        ? [
            {
              label: t("common.edit"),
              onSelect: (row) => {
                setEditing(row);
                setFormOpen(true);
              },
            },
            ...(canRelink ? [{
              label: t("masterData.driver.relink.action"),
              onSelect: (row: Driver) => setRelinkTarget(row),
            }] : []),
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
          ]
        : [],
    [canManage, canRelink, t]
  );

  const resolveErrorMessage = useCallback(
    (cause: unknown) => resolveDriverErrorMessage(cause, t),
    [t]
  );
  const resolveMutationErrorMessage = useCallback(
    (cause: unknown) => resolveDriverErrorMessage(cause, t, "mutation"),
    [t]
  );

  return (
    <ResourcePage<Driver>
      title={t("masterData.driver.title")}
      description={t("masterData.driver.description")}
      searchPlaceholder={t("masterData.driver.searchPlaceholder")}
      emptyMessage={t("masterData.driver.empty")}
      createLabel={t("masterData.driver.create")}
      canCreate={canManage}
      columns={columns}
      fetchPage={listDriversApi}
      resolveErrorMessage={resolveErrorMessage}
      buildActions={buildActions}
      onCreate={() => {
        setEditing(null);
        setFormOpen(true);
      }}
      renderDialogs={(reload) => (
        <>
          {relinkTarget && canManage ? (
            <DriverRelinkDialog
              key={`${relinkTarget.id}:${relinkTarget.version}`}
              driver={relinkTarget}
              onClose={() => setRelinkTarget(null)}
              onSaved={reload}
            />
          ) : null}
          <DriverFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            driver={editing}
            onSaved={reload}
          />
          <StatusToggleDialog
            target={statusTarget}
            onClear={() => setStatusTarget(null)}
            onConfirm={(row, action) =>
              setDriverStatusApi(row.id, action, row.version)
            }
            resolveErrorMessage={resolveMutationErrorMessage}
            onError={(cause) => {
              if (
                isDriverConflictError(cause) ||
                isUnknownDriverMutationOutcome(cause)
              ) {
                setStatusTarget(null);
                reload();
              }
            }}
            disableDescription={t("masterData.driver.disableDescription")}
            enableDescription={t("masterData.driver.enableDescription")}
            onDone={reload}
          />
        </>
      )}
    />
  );
}
