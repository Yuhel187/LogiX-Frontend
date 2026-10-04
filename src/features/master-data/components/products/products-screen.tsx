"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { listProductsApi, setProductStatusApi } from "../../api/products.api";
import type { Product } from "../../schemas/product.schema";
import { ResourcePage } from "../shared/resource-page";
import type {
  ResourceColumn,
  ResourceRowAction,
} from "../shared/resource-table";
import { StatusToggleDialog } from "../shared/status-toggle-dialog";
import { ProductFormDialog } from "./product-form-dialog";

export function ProductsScreen() {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [statusTarget, setStatusTarget] = useState<Product | null>(null);

  const columns: ResourceColumn<Product>[] = [
    {
      key: "sku",
      header: t("masterData.product.sku"),
      cell: (row) => <span className="font-mono text-xs">{row.sku}</span>,
      className: "w-40",
    },
    {
      key: "name",
      header: t("masterData.product.name"),
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "baseUnit",
      header: t("masterData.product.baseUnit"),
      cell: (row) => row.baseUnit,
      className: "w-32",
    },
    {
      key: "weight",
      header: t("masterData.product.weight"),
      cell: (row) => <span className="tabular-nums">{row.weight}</span>,
      className: "w-32 text-right",
    },
    {
      key: "volume",
      header: t("masterData.product.volume"),
      cell: (row) => <span className="tabular-nums">{row.volume}</span>,
      className: "w-32 text-right",
    },
  ];

  const buildActions = useCallback(
    (): ResourceRowAction<Product>[] => [
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
    <ResourcePage<Product>
      title={t("masterData.product.title")}
      description={t("masterData.product.description")}
      searchPlaceholder={t("masterData.product.searchPlaceholder")}
      emptyMessage={t("masterData.product.empty")}
      createLabel={t("masterData.product.create")}
      columns={columns}
      fetchPage={listProductsApi}
      buildActions={buildActions}
      onCreate={() => {
        setEditing(null);
        setFormOpen(true);
      }}
      renderDialogs={(reload) => (
        <>
          <ProductFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            product={editing}
            onSaved={reload}
          />
          <StatusToggleDialog
            target={statusTarget}
            onClear={() => setStatusTarget(null)}
            onConfirm={(row, action) => setProductStatusApi(row.id, action)}
            disableDescription={t("masterData.product.disableDescription")}
            enableDescription={t("masterData.product.enableDescription")}
            onDone={reload}
          />
        </>
      )}
    />
  );
}
