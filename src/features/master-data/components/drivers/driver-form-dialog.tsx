"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "../shared/form-field";
import { useTranslation } from "@/lib/i18n";
import {
  createDriverApi,
  updateDriverApi,
} from "../../api/drivers.api";
import {
  driverFormSchema,
  type Driver,
  type EligibleDriverUser,
} from "../../schemas/driver.schema";
import {
  isDriverConflictError,
  isUnknownDriverMutationOutcome,
  resolveDriverErrorMessage,
} from "../../utils/driver-error-message";
import { useResourceForm } from "../use-resource-form";
import { DriverUserPicker } from "./driver-user-picker";

type DriverFormValues = {
  code: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: string;
  phone: string;
};

const EMPTY: DriverFormValues = {
  code: "",
  userId: "",
  licenseNumber: "",
  licenseExpiry: "",
  phone: "",
};

function toFormValues(driver: Driver | null): DriverFormValues {
  if (!driver) return EMPTY;
  return {
    code: driver.code,
    userId: driver.userId,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry,
    phone: driver.phone ?? "",
  };
}

interface DriverFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
  onSaved: () => void;
}

export function DriverFormDialog({
  open,
  onOpenChange,
  driver,
  onSaved,
}: DriverFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = driver !== null;
  const [selectedUser, setSelectedUser] =
    useState<EligibleDriverUser | null>(null);
  const form = useResourceForm<DriverFormValues>(
    toFormValues(driver),
    driverFormSchema,
    {
      uniqueField: "code",
      uniqueMessage: t("masterData.driver.errors.conflict"),
      successMessage: t("masterData.saveSuccess"),
      treatConflictAsDuplicate: false,
      resolveErrorMessage: (cause) =>
        resolveDriverErrorMessage(cause, t, "mutation"),
      resolveValidationMessage: (message) => t(message),
      onError: (cause) => {
        if (
          isDriverConflictError(cause) ||
          isUnknownDriverMutationOutcome(cause)
        ) {
          onOpenChange(false);
          onSaved();
        }
      },
      submit: async (values) => {
        if (driver) {
          await updateDriverApi(driver.id, {
            version: driver.version,
            licenseNumber: values.licenseNumber.trim(),
            licenseExpiry: values.licenseExpiry,
            phone: values.phone.trim() || null,
          });
          return;
        }
        await createDriverApi({
          code: values.code.trim(),
          userId: values.userId,
          licenseNumber: values.licenseNumber.trim(),
          licenseExpiry: values.licenseExpiry,
          phone: values.phone.trim() || undefined,
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
    if (!open) return;
    reset(toFormValues(driver));
  }, [driver, open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("masterData.driver.editTitle")
              : t("masterData.driver.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("masterData.driver.formDescription")}
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
              id="driver-code"
              label={t("masterData.driver.code")}
              required={!isEdit}
              disabled={isEdit}
              hint={isEdit ? t("masterData.codeImmutable") : undefined}
              value={form.values.code}
              error={form.errors.code}
              onChange={(event) => form.setValue("code", event.target.value)}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="driver-user"
                className="text-sm font-medium leading-none"
              >
                {t("masterData.driver.user")}
                {!isEdit ? <span className="text-destructive"> *</span> : null}
              </label>
              {isEdit ? (
                <div
                  id="driver-user"
                  className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground"
                  aria-disabled="true"
                >
                  {driver?.displayName ?? ""}
                </div>
              ) : (
                <DriverUserPicker
                  id="driver-user"
                  value={form.values.userId}
                  selectedUser={selectedUser}
                  error={form.errors.userId}
                  onSelect={(user) => {
                    setSelectedUser(user);
                    form.setValue("userId", user.id);
                  }}
                />
              )}
              {isEdit ? (
                <p className="text-xs text-muted-foreground">
                  {t("masterData.driver.userImmutable")}
                </p>
              ) : null}
            </div>
          </div>

          <FormField
            id="driver-license"
            label={t("masterData.driver.licenseNumber")}
            required
            value={form.values.licenseNumber}
            error={form.errors.licenseNumber}
            onChange={(event) =>
              form.setValue("licenseNumber", event.target.value)
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="driver-license-expiry"
              label={t("masterData.driver.licenseExpiry")}
              type="date"
              required
              value={form.values.licenseExpiry}
              error={form.errors.licenseExpiry}
              onChange={(event) =>
                form.setValue("licenseExpiry", event.target.value)
              }
            />
            <FormField
              id="driver-phone"
              label={t("masterData.driver.phone")}
              type="tel"
              value={form.values.phone}
              error={form.errors.phone}
              onChange={(event) => form.setValue("phone", event.target.value)}
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
              {form.isSubmitting
                ? t("masterData.working")
                : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
