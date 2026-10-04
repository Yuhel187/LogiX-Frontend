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
  createProductSchema,
  updateProductSchema,
  type Product,
} from "../../schemas/product.schema";
import { createProductApi, updateProductApi } from "../../api/products.api";
import { FormField, decimalInputProps } from "../shared/form-field";
import { useResourceForm } from "../use-resource-form";

type ProductFormValues = {
  sku: string;
  name: string;
  baseUnit: string;
  weight: string;
  volume: string;
};

const EMPTY: ProductFormValues = {
  sku: "",
  name: "",
  baseUnit: "",
  weight: "",
  volume: "",
};

function toFormValues(product: Product | null): ProductFormValues {
  if (!product) return EMPTY;
  return {
    sku: product.sku,
    name: product.name,
    baseUnit: product.baseUnit,
    weight: product.weight,
    volume: product.volume,
  };
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSaved: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = product !== null;

  const form = useResourceForm<ProductFormValues>(
    toFormValues(product),
    isEdit ? updateProductSchema : createProductSchema,
    {
      uniqueField: "sku",
      uniqueMessage: t("masterData.product.duplicateCode"),
      successMessage: t("masterData.saveSuccess"),
      submit: async (values) => {
        if (isEdit) {
          return updateProductApi(product.id, {
            name: values.name,
            baseUnit: values.baseUnit,
            weight: values.weight,
            volume: values.volume,
          });
        }
        return createProductApi(values);
      },
      onSuccess: () => {
        onOpenChange(false);
        onSaved();
      },
    }
  );

  const { reset } = form;
  useEffect(() => {
    if (open) reset(toFormValues(product));
  }, [open, product, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("masterData.product.editTitle")
              : t("masterData.product.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("masterData.product.formDescription")}
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
              id="product-sku"
              label={t("masterData.product.sku")}
              required
              disabled={isEdit}
              hint={isEdit ? t("masterData.product.skuImmutable") : undefined}
              value={form.values.sku}
              error={form.errors.sku}
              onChange={(e) => form.setValue("sku", e.target.value)}
            />
            <FormField
              id="product-unit"
              label={t("masterData.product.baseUnit")}
              required
              placeholder={t("masterData.product.baseUnitPlaceholder")}
              value={form.values.baseUnit}
              error={form.errors.baseUnit}
              onChange={(e) => form.setValue("baseUnit", e.target.value)}
            />
          </div>

          <FormField
            id="product-name"
            label={t("masterData.product.name")}
            required
            value={form.values.name}
            error={form.errors.name}
            onChange={(e) => form.setValue("name", e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="product-weight"
              label={t("masterData.product.weight")}
              required
              {...decimalInputProps}
              placeholder="12.345"
              value={form.values.weight}
              error={form.errors.weight}
              onChange={(e) => form.setValue("weight", e.target.value)}
            />
            <FormField
              id="product-volume"
              label={t("masterData.product.volume")}
              required
              {...decimalInputProps}
              placeholder="0.045678"
              value={form.values.volume}
              error={form.errors.volume}
              onChange={(e) => form.setValue("volume", e.target.value)}
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
