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
  createVehicleSchema,
  updateVehicleSchema,
  type Vehicle,
} from "../../schemas/vehicle.schema";
import { createVehicleApi, updateVehicleApi } from "../../api/vehicles.api";
import { FormField, decimalInputProps } from "../shared/form-field";
import { useResourceForm } from "../use-resource-form";

type VehicleFormValues = {
  code: string;
  licensePlate: string;
  capacityWeight: string;
  capacityVolume: string;
};

const EMPTY: VehicleFormValues = {
  code: "",
  licensePlate: "",
  capacityWeight: "",
  capacityVolume: "",
};

function toFormValues(vehicle: Vehicle | null): VehicleFormValues {
  if (!vehicle) return EMPTY;
  return {
    code: vehicle.code,
    licensePlate: vehicle.licensePlate,
    capacityWeight: vehicle.capacityWeight,
    capacityVolume: vehicle.capacityVolume,
  };
}

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onSaved: () => void;
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  onSaved,
}: VehicleFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = vehicle !== null;

  const form = useResourceForm<VehicleFormValues>(
    toFormValues(vehicle),
    isEdit ? updateVehicleSchema : createVehicleSchema,
    {
      // A 409 here can be either the code or the plate; the message says both.
      uniqueField: "code",
      uniqueMessage: t("masterData.vehicle.duplicateCode"),
      successMessage: t("masterData.saveSuccess"),
      submit: async (values) => {
        if (isEdit) {
          return updateVehicleApi(vehicle.id, {
            licensePlate: values.licensePlate,
            capacityWeight: values.capacityWeight,
            capacityVolume: values.capacityVolume,
          });
        }
        return createVehicleApi(values);
      },
      onSuccess: () => {
        onOpenChange(false);
        onSaved();
      },
    }
  );

  const { reset } = form;
  useEffect(() => {
    if (open) reset(toFormValues(vehicle));
  }, [open, vehicle, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("masterData.vehicle.editTitle")
              : t("masterData.vehicle.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("masterData.vehicle.formDescription")}
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
              id="vehicle-code"
              label={t("masterData.vehicle.code")}
              required
              disabled={isEdit}
              hint={isEdit ? t("masterData.codeImmutable") : undefined}
              value={form.values.code}
              error={form.errors.code}
              onChange={(e) => form.setValue("code", e.target.value)}
            />
            <FormField
              id="vehicle-plate"
              label={t("masterData.vehicle.licensePlate")}
              required
              placeholder="29C-123.45"
              value={form.values.licensePlate}
              error={form.errors.licensePlate}
              onChange={(e) => form.setValue("licensePlate", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="vehicle-capacity-weight"
              label={t("masterData.vehicle.capacityWeight")}
              required
              {...decimalInputProps}
              placeholder="1500.000"
              value={form.values.capacityWeight}
              error={form.errors.capacityWeight}
              onChange={(e) => form.setValue("capacityWeight", e.target.value)}
            />
            <FormField
              id="vehicle-capacity-volume"
              label={t("masterData.vehicle.capacityVolume")}
              required
              {...decimalInputProps}
              placeholder="12.500000"
              value={form.values.capacityVolume}
              error={form.errors.capacityVolume}
              onChange={(e) => form.setValue("capacityVolume", e.target.value)}
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
