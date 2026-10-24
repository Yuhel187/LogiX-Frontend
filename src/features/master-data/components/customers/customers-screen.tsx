"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  listCustomersApi,
  enableCustomerApi,
} from "../../api/customers.api";
import type { Customer } from "../../schemas/customer.schema";
import { ResourcePage } from "../shared/resource-page";
import type {
  ResourceColumn,
  ResourceRowAction,
} from "../shared/resource-table";
import { StatusToggleDialog } from "../shared/status-toggle-dialog";
import { CustomerFormDialog } from "./customer-form-dialog";
import { DisableCustomerDialog } from "./disable-customer-dialog";
import { CustomerAddressesDialog } from "./customer-addresses-dialog";

export function CustomersScreen() {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const [disableTarget, setDisableTarget] = useState<Customer | null>(null);
  const [enableTarget, setEnableTarget] = useState<Customer | null>(null);

  const [addressesTarget, setAddressesTarget] = useState<Customer | null>(null);
  const [addressesOpen, setAddressesOpen] = useState(false);

  const columns: ResourceColumn<Customer>[] = [
    {
      key: "code",
      header: t("masterData.customer.code"),
      cell: (row) => (
        <span className="font-mono text-xs font-semibold">{row.code}</span>
      ),
      className: "w-36",
    },
    {
      key: "name",
      header: t("masterData.customer.name"),
      cell: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.name}</span>
          {row.disabledReason ? (
            <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
              Lý do ngưng: {row.disabledReason}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "taxCode",
      header: t("masterData.customer.taxCode"),
      cell: (row) => row.taxCode || "—",
      className: "w-32",
    },
    {
      key: "phone",
      header: t("masterData.customer.phone"),
      cell: (row) => row.phone || "—",
      className: "w-36",
    },
    {
      key: "email",
      header: t("masterData.customer.email"),
      cell: (row) => row.email || "—",
      className: "w-48",
    },
  ];

  const buildActions = useCallback(
    (): ResourceRowAction<Customer>[] => [
      {
        label: t("masterData.customer.manageAddresses"),
        onSelect: (row) => {
          setAddressesTarget(row);
          setAddressesOpen(true);
        },
      },
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
        onSelect: (row) => setDisableTarget(row),
      },
      {
        label: t("masterData.enable"),
        hidden: (row) => row.status !== "INACTIVE",
        onSelect: (row) => setEnableTarget(row),
      },
    ],
    [t]
  );

  return (
    <ResourcePage<Customer>
      title={t("masterData.customer.title")}
      description={t("masterData.customer.description")}
      searchPlaceholder={t("masterData.customer.searchPlaceholder")}
      emptyMessage={t("masterData.customer.empty")}
      createLabel={t("masterData.customer.create")}
      columns={columns}
      fetchPage={listCustomersApi}
      buildActions={buildActions}
      onCreate={() => {
        setEditing(null);
        setFormOpen(true);
      }}
      renderDialogs={(reload) => (
        <>
          <CustomerFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            customer={editing}
            onSaved={reload}
          />

          <CustomerAddressesDialog
            customer={addressesTarget}
            open={addressesOpen}
            onOpenChange={(open) => {
              setAddressesOpen(open);
              if (!open) setAddressesTarget(null);
            }}
          />

          <DisableCustomerDialog
            customer={disableTarget}
            onClear={() => setDisableTarget(null)}
            onDone={reload}
          />

          <StatusToggleDialog
            target={enableTarget}
            onClear={() => setEnableTarget(null)}
            onConfirm={(row) => enableCustomerApi(row.id)}
            disableDescription=""
            enableDescription={t("masterData.customer.enableDescription")}
            onDone={reload}
          />
        </>
      )}
    />
  );
}
