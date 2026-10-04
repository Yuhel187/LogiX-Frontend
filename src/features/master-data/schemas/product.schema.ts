import { z } from "zod";
import {
  VOLUME_DECIMAL,
  WEIGHT_DECIMAL,
  auditResponseFields,
  paginatedSchema,
} from "./common.schema";

export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  baseUnit: z.string(),
  weight: z.string(),
  volume: z.string(),
  ...auditResponseFields,
});

export const paginatedProductsSchema = paginatedSchema(productSchema);

export const createProductSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU không được để trống")
    .max(100, "SKU tối đa 100 ký tự"),
  name: z
    .string()
    .min(1, "Tên sản phẩm không được để trống")
    .max(200, "Tên sản phẩm tối đa 200 ký tự"),
  baseUnit: z
    .string()
    .min(1, "Đơn vị cơ sở không được để trống")
    .max(30, "Đơn vị cơ sở tối đa 30 ký tự"),
  weight: z
    .string()
    .regex(WEIGHT_DECIMAL, "Khối lượng phải là số không âm, tối đa 3 chữ số thập phân"),
  volume: z
    .string()
    .regex(VOLUME_DECIMAL, "Thể tích phải là số không âm, tối đa 6 chữ số thập phân"),
});

export const updateProductSchema = createProductSchema
  .omit({ sku: true })
  .partial();

export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
