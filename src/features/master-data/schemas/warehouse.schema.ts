import { z } from "zod";
import {
  addressFieldsSchema,
  auditResponseFields,
  geoResponseFields,
  optionalLatitude,
  optionalLongitude,
  paginatedSchema,
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
  code: z
    .string()
    .min(1, "Mã kho không được để trống")
    .max(50, "Mã kho tối đa 50 ký tự"),
  name: z
    .string()
    .min(1, "Tên kho không được để trống")
    .max(200, "Tên kho tối đa 200 ký tự"),
  ...addressFieldsSchema,
  latitude: optionalLatitude,
  longitude: optionalLongitude,
});

/** `code` is omitted: the backend treats it as the immutable per-tenant key. */
export const updateWarehouseSchema = createWarehouseSchema
  .omit({ code: true })
  .partial();

export type Warehouse = z.infer<typeof warehouseSchema>;
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
