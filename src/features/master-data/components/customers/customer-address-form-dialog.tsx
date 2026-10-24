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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import {
  createCustomerAddressSchema,
  updateCustomerAddressSchema,
  type CustomerAddress,
  type CustomerAddressType,
} from "../../schemas/customer.schema";
import {
  createCustomerAddressApi,
  updateCustomerAddressApi,
} from "../../api/customers.api";
import { FormField } from "../shared/form-field";
import { useResourceForm } from "../use-resource-form";

type CustomerAddressFormValues = {
  addressType: CustomerAddressType;
  label: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  province: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  deliveryNote: string;
  isDefault: boolean;
};

const EMPTY: CustomerAddressFormValues = {
  addressType: "SHIPPING",
  label: "",
  recipientName: "",
  phone: "",
  addressLine: "",
  ward: "",
  district: "",
  province: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  deliveryNote: "",
  isDefault: false,
};

function toFormValues(address: CustomerAddress | null): CustomerAddressFormValues {
  if (!address) return EMPTY;
  return {
    addressType: address.addressType,
    label: address.label ?? "",
    recipientName: address.recipientName,
    phone: address.phone ?? "",
    addressLine: address.addressLine,
    ward: address.ward ?? "",
    district: address.district ?? "",
    province: address.province,
    postalCode: address.postalCode ?? "",
    latitude: address.latitude ?? "",
    longitude: address.longitude ?? "",
    deliveryNote: address.deliveryNote ?? "",
    isDefault: address.isDefault,
  };
}

interface CustomerAddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  address: CustomerAddress | null;
  onSaved: () => void;
}

export function CustomerAddressFormDialog({
  open,
  onOpenChange,
  customerId,
  address,
  onSaved,
}: CustomerAddressFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = address !== null;

  const form = useResourceForm<CustomerAddressFormValues>(
    toFormValues(address),
    isEdit ? updateCustomerAddressSchema : createCustomerAddressSchema,
    {
      uniqueField: "recipientName",
      uniqueMessage: "",
      successMessage: t("masterData.saveSuccess"),
      submit: async (values) => {
        if (isEdit) {
          return updateCustomerAddressApi(customerId, address.id, {
            label: values.label.trim() || undefined,
            recipientName: values.recipientName.trim(),
            phone: values.phone.trim() || undefined,
            addressLine: values.addressLine.trim(),
            ward: values.ward.trim() || undefined,
            district: values.district.trim() || undefined,
            province: values.province.trim(),
            postalCode: values.postalCode.trim() || undefined,
            latitude: values.latitude.trim() || undefined,
            longitude: values.longitude.trim() || undefined,
            deliveryNote: values.deliveryNote.trim() || undefined,
          });
        }
        return createCustomerAddressApi(customerId, {
          addressType: values.addressType,
          label: values.label.trim() || undefined,
          recipientName: values.recipientName.trim(),
          phone: values.phone.trim() || undefined,
          addressLine: values.addressLine.trim(),
          ward: values.ward.trim() || undefined,
          district: values.district.trim() || undefined,
          province: values.province.trim(),
          postalCode: values.postalCode.trim() || undefined,
          latitude: values.latitude.trim() || undefined,
          longitude: values.longitude.trim() || undefined,
          deliveryNote: values.deliveryNote.trim() || undefined,
          isDefault: values.isDefault,
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
    if (open) reset(toFormValues(address));
  }, [open, address, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("masterData.customer.editAddressTitle")
              : t("masterData.customer.createAddressTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("masterData.customer.addressFormDescription")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="address-type">
                {t("masterData.customer.addressType")}
                <span className="text-destructive"> *</span>
              </Label>
              <Select
                value={form.values.addressType}
                onValueChange={(val) =>
                  form.setValue("addressType", val as CustomerAddressType)
                }
                disabled={isEdit}
              >
                <SelectTrigger id="address-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHIPPING">
                    {t("masterData.customer.shippingType")}
                  </SelectItem>
                  <SelectItem value="BILLING">
                    {t("masterData.customer.billingType")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FormField
              id="address-label"
              label={t("masterData.customer.label")}
              placeholder={t("masterData.customer.labelPlaceholder")}
              value={form.values.label}
              error={form.errors.label}
              onChange={(e) => form.setValue("label", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="address-recipientName"
              label={t("masterData.customer.recipientName")}
              required
              value={form.values.recipientName}
              error={form.errors.recipientName}
              onChange={(e) => form.setValue("recipientName", e.target.value)}
            />
            <FormField
              id="address-phone"
              label={t("masterData.customer.recipientPhone")}
              type="tel"
              value={form.values.phone}
              error={form.errors.phone}
              onChange={(e) => form.setValue("phone", e.target.value)}
            />
          </div>

          <FormField
            id="address-line"
            label={t("masterData.addressLine")}
            required
            value={form.values.addressLine}
            error={form.errors.addressLine}
            onChange={(e) => form.setValue("addressLine", e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="address-ward"
              label={t("masterData.ward")}
              value={form.values.ward}
              error={form.errors.ward}
              onChange={(e) => form.setValue("ward", e.target.value)}
            />
            <FormField
              id="address-district"
              label={t("masterData.district")}
              value={form.values.district}
              error={form.errors.district}
              onChange={(e) => form.setValue("district", e.target.value)}
            />
            <FormField
              id="address-province"
              label={t("masterData.province")}
              required
              value={form.values.province}
              error={form.errors.province}
              onChange={(e) => form.setValue("province", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="address-postalCode"
              label={t("masterData.postalCode")}
              value={form.values.postalCode}
              error={form.errors.postalCode}
              onChange={(e) => form.setValue("postalCode", e.target.value)}
            />
            <FormField
              id="address-latitude"
              label={t("masterData.latitude")}
              placeholder="21.028511"
              value={form.values.latitude}
              error={form.errors.latitude}
              onChange={(e) => form.setValue("latitude", e.target.value)}
            />
            <FormField
              id="address-longitude"
              label={t("masterData.longitude")}
              placeholder="105.854444"
              value={form.values.longitude}
              error={form.errors.longitude}
              onChange={(e) => form.setValue("longitude", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address-deliveryNote">
              {t("masterData.customer.deliveryNote")}
            </Label>
            <Textarea
              id="address-deliveryNote"
              placeholder={t("masterData.customer.deliveryNotePlaceholder")}
              rows={2}
              value={form.values.deliveryNote}
              onChange={(e) => form.setValue("deliveryNote", e.target.value)}
            />
            {form.errors.deliveryNote ? (
              <p className="text-xs text-destructive">{form.errors.deliveryNote}</p>
            ) : null}
          </div>

          {!isEdit ? (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="address-isDefault"
                checked={form.values.isDefault}
                onCheckedChange={(checked) =>
                  form.setValue("isDefault", checked === true)
                }
              />
              <Label
                htmlFor="address-isDefault"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {t("masterData.customer.isDefault")}
              </Label>
            </div>
          ) : null}

          <DialogFooter className="pt-2">
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
