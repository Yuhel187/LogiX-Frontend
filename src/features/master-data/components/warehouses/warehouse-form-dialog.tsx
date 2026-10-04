"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  type Warehouse,
} from "../../schemas/warehouse.schema";
import {
  createWarehouseApi,
  updateWarehouseApi,
} from "../../api/warehouses.api";
import { FormField } from "../shared/form-field";
import { useResourceForm } from "../use-resource-form";

type WarehouseFormValues = {
  code: string;
  name: string;
  addressLine: string;
  ward: string;
  district: string;
  province: string;
  postalCode: string;
  latitude: string;
  longitude: string;
};

const EMPTY: WarehouseFormValues = {
  code: "",
  name: "",
  addressLine: "",
  ward: "",
  district: "",
  province: "",
  postalCode: "",
  latitude: "",
  longitude: "",
};

function toFormValues(warehouse: Warehouse | null): WarehouseFormValues {
  if (!warehouse) return EMPTY;
  return {
    code: warehouse.code,
    name: warehouse.name,
    addressLine: warehouse.addressLine,
    ward: warehouse.ward ?? "",
    district: warehouse.district ?? "",
    province: warehouse.province,
    postalCode: warehouse.postalCode ?? "",
    latitude: warehouse.latitude ?? "",
    longitude: warehouse.longitude ?? "",
  };
}

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: Warehouse | null;
  onSaved: () => void;
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
  onSaved,
}: WarehouseFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = warehouse !== null;

  const form = useResourceForm<WarehouseFormValues>(
    toFormValues(warehouse),
    isEdit ? updateWarehouseSchema : createWarehouseSchema,
    {
      uniqueField: "code",
      uniqueMessage: t("masterData.warehouse.duplicateCode"),
      successMessage: t("masterData.saveSuccess"),
      submit: async (values) => {
        if (isEdit) {
          return updateWarehouseApi(warehouse.id, {
            name: values.name,
            addressLine: values.addressLine,
            ward: values.ward,
            district: values.district,
            province: values.province,
            postalCode: values.postalCode,
            latitude: values.latitude,
            longitude: values.longitude,
          });
        }
        return createWarehouseApi(values);
      },
      onSuccess: () => {
        onOpenChange(false);
        onSaved();
      },
    }
  );

  const { reset } = form;
  useEffect(() => {
    if (open) reset(toFormValues(warehouse));
  }, [open, warehouse, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("masterData.warehouse.editTitle")
              : t("masterData.warehouse.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("masterData.warehouse.formDescription")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="warehouse-code"
              label={t("masterData.warehouse.code")}
              required
              disabled={isEdit}
              hint={isEdit ? t("masterData.codeImmutable") : undefined}
              value={form.values.code}
              error={form.errors.code}
              onChange={(e) => form.setValue("code", e.target.value)}
            />
            <FormField
              id="warehouse-name"
              label={t("masterData.warehouse.name")}
              required
              value={form.values.name}
              error={form.errors.name}
              onChange={(e) => form.setValue("name", e.target.value)}
            />
          </div>

          <FormField
            id="warehouse-address"
            label={t("masterData.addressLine")}
            required
            value={form.values.addressLine}
            error={form.errors.addressLine}
            onChange={(e) => form.setValue("addressLine", e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="warehouse-ward"
              label={t("masterData.ward")}
              value={form.values.ward}
              error={form.errors.ward}
              onChange={(e) => form.setValue("ward", e.target.value)}
            />
            <FormField
              id="warehouse-district"
              label={t("masterData.district")}
              value={form.values.district}
              error={form.errors.district}
              onChange={(e) => form.setValue("district", e.target.value)}
            />
            <FormField
              id="warehouse-province"
              label={t("masterData.province")}
              required
              value={form.values.province}
              error={form.errors.province}
              onChange={(e) => form.setValue("province", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="warehouse-postal"
              label={t("masterData.postalCode")}
              value={form.values.postalCode}
              error={form.errors.postalCode}
              onChange={(e) => form.setValue("postalCode", e.target.value)}
            />
            <FormField
              id="warehouse-latitude"
              label={t("masterData.latitude")}
              inputMode="decimal"
              placeholder="21.012345"
              value={form.values.latitude}
              error={form.errors.latitude}
              onChange={(e) => form.setValue("latitude", e.target.value)}
            />
            <FormField
              id="warehouse-longitude"
              label={t("masterData.longitude")}
              inputMode="decimal"
              placeholder="105.812345"
              value={form.values.longitude}
              error={form.errors.longitude}
              onChange={(e) => form.setValue("longitude", e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? t("masterData.working") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
