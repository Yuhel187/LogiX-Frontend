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
  createCustomerSchema,
  updateCustomerSchema,
  type Customer,
} from "../../schemas/customer.schema";
import {
  createCustomerApi,
  updateCustomerApi,
} from "../../api/customers.api";
import { FormField } from "../shared/form-field";
import { useResourceForm } from "../use-resource-form";

type CustomerFormValues = {
  code: string;
  name: string;
  taxCode: string;
  phone: string;
  email: string;
};

const EMPTY: CustomerFormValues = {
  code: "",
  name: "",
  taxCode: "",
  phone: "",
  email: "",
};

function toFormValues(customer: Customer | null): CustomerFormValues {
  if (!customer) return EMPTY;
  return {
    code: customer.code,
    name: customer.name,
    taxCode: customer.taxCode ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
  };
}

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSaved: () => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: CustomerFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = customer !== null;

  const form = useResourceForm<CustomerFormValues>(
    toFormValues(customer),
    isEdit ? updateCustomerSchema : createCustomerSchema,
    {
      uniqueField: "code",
      uniqueMessage: t("masterData.customer.duplicateCode"),
      successMessage: t("masterData.saveSuccess"),
      submit: async (values) => {
        if (isEdit) {
          return updateCustomerApi(customer.id, {
            name: values.name,
            taxCode: values.taxCode || undefined,
            phone: values.phone || undefined,
            email: values.email || undefined,
          });
        }
        return createCustomerApi({
          code: values.code,
          name: values.name,
          taxCode: values.taxCode || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
        });
      },
      onSuccess: () => {
        onOpenChange(false);
        onSaved();
      },
    }
  );

  const { reset } = form;
  useEffect(() => {
    if (open) reset(toFormValues(customer));
  }, [open, customer, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("masterData.customer.editTitle")
              : t("masterData.customer.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("masterData.customer.formDescription")}
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
              id="customer-code"
              label={t("masterData.customer.code")}
              required
              disabled={isEdit}
              hint={isEdit ? t("masterData.customer.codeImmutable") : undefined}
              value={form.values.code}
              error={form.errors.code}
              onChange={(e) => form.setValue("code", e.target.value)}
            />
            <FormField
              id="customer-taxCode"
              label={t("masterData.customer.taxCode")}
              value={form.values.taxCode}
              error={form.errors.taxCode}
              onChange={(e) => form.setValue("taxCode", e.target.value)}
            />
          </div>

          <FormField
            id="customer-name"
            label={t("masterData.customer.name")}
            required
            value={form.values.name}
            error={form.errors.name}
            onChange={(e) => form.setValue("name", e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="customer-phone"
              label={t("masterData.customer.phone")}
              type="tel"
              value={form.values.phone}
              error={form.errors.phone}
              onChange={(e) => form.setValue("phone", e.target.value)}
            />
            <FormField
              id="customer-email"
              label={t("masterData.customer.email")}
              type="email"
              value={form.values.email}
              error={form.errors.email}
              onChange={(e) => form.setValue("email", e.target.value)}
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
