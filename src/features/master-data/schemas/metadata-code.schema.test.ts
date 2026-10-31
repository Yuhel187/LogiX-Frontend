import { describe, expect, it } from "vitest";
import { resolveLocaleMessage } from "@/lib/i18n";
import { createCustomerSchema, updateCustomerSchema } from "./customer.schema";
import { createDriverSchema, updateDriverSchema, updateDriverFormSchema } from "./driver.schema";
import { createProductSchema, updateProductSchema } from "./product.schema";
import { createVehicleSchema, updateVehicleSchema } from "./vehicle.schema";
import { createWarehouseSchema, updateWarehouseSchema } from "./warehouse.schema";

const resources = [
  { name: "customer", field: "code", max: 50, create: createCustomerSchema, update: updateCustomerSchema,
    input: { name: "Customer" }, updateInput: {} },
  { name: "warehouse", field: "code", max: 50, create: createWarehouseSchema, update: updateWarehouseSchema,
    input: { name: "Warehouse", addressLine: "Address", province: "Province" }, updateInput: {} },
  { name: "vehicle", field: "code", max: 50, create: createVehicleSchema, update: updateVehicleSchema,
    input: { licensePlate: "51C-12345", capacityWeight: "1000", capacityVolume: "10" }, updateInput: {} },
  { name: "product", field: "sku", max: 100, create: createProductSchema, update: updateProductSchema,
    input: { name: "Product", baseUnit: "piece", weight: "1", volume: "0.1" }, updateInput: {} },
  { name: "driver", field: "code", max: 50, create: createDriverSchema, update: updateDriverSchema,
    input: { userId: "user-1", licenseNumber: "LIC-01", licenseExpiry: "2029-01-01" }, updateInput: { version: 1 } },
];

describe.each(resources)("$name editable metadata code", (resource) => {
  it.each([undefined, "", "   "])("accepts a missing or blank create code (%s) for backend generation", (code) => {
    const parsed = resource.create.parse({ ...resource.input, [resource.field]: code });
    expect(parsed).toMatchObject({ [resource.field]: undefined });
  });

  it("trims user-provided codes on create and edit", () => {
    expect(resource.create.parse({
      ...resource.input, [resource.field]: " CUSTOM-001 ",
    })).toMatchObject({ [resource.field]: "CUSTOM-001" });
    expect(resource.update.parse({
      ...resource.updateInput, [resource.field]: " CUSTOM-002 ",
    })).toMatchObject({ [resource.field]: "CUSTOM-002" });
  });

  it("allows omitted edit code but rejects attempts to clear an existing code", () => {
    expect(resource.update.safeParse(resource.updateInput).success).toBe(true);
    for (const value of ["", "  ", null]) {
      expect(resource.update.safeParse({
        ...resource.updateInput, [resource.field]: value,
      }).success).toBe(false);
    }
  });

  it("retains the exact accepted maximum and localized errors in VI/EN", () => {
    expect(resource.create.safeParse({
      ...resource.input, [resource.field]: "X".repeat(resource.max),
    }).success).toBe(true);
    const result = resource.create.safeParse({
      ...resource.input, [resource.field]: "X".repeat(resource.max + 1),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      for (const locale of ["vi", "en"]) {
        const message = result.error.issues[0].message;
        expect(resolveLocaleMessage(locale, message)).not.toBe(message);
      }
    }
  });
});

it("requires a nonblank code in the Driver edit form without allowing association edits", () => {
  const input = { userId: "user-1", licenseNumber: "LIC-01", licenseExpiry: "2029-01-01" };
  expect(updateDriverFormSchema.safeParse({ ...input, code: "" }).success).toBe(false);
  expect(updateDriverFormSchema.safeParse({ ...input, code: "DRV-000001" }).success).toBe(true);
  expect(updateDriverSchema.safeParse({
    version: 1, code: "DRV-000002", userId: "other-user",
  }).success).toBe(false);
});
