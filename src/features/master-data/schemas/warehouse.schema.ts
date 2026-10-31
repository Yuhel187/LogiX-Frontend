import { z } from "zod";
import {
  addressFieldsSchema,
  auditResponseFields,
  geoResponseFields,
  optionalLatitude,
  optionalLongitude,
  paginatedSchema,
  metadataCodeSchema,
  optionalGeneratedCodeSchema,
} from "./common.schema";

export const warehouseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  addressLine: z.string(),
  ward: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string(),
  postalCode: z.string().nullable(),
  ...geoResponseFields,
  ...auditResponseFields,
});

export const paginatedWarehousesSchema = paginatedSchema(warehouseSchema);

export const createWarehouseSchema = z.object({
  code: optionalGeneratedCodeSchema(50),
  name: z
    .string()
    .min(1, "Tên kho không được để trống")
    .max(200, "Tên kho tối đa 200 ký tự"),
  ...addressFieldsSchema,
  latitude: optionalLatitude,
  longitude: optionalLongitude,
});

export const updateWarehouseSchema = createWarehouseSchema
  .partial()
  .extend({ code: metadataCodeSchema(50).optional() });

export type Warehouse = z.infer<typeof warehouseSchema>;
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
