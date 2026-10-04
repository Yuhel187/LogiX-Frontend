import { z } from "zod";

// Shapes traced to LogiX-Backend
// `apps/master-data-service/src/master-data/common/master-data.types.ts` and
// the DTOs under `apps/master-data-service/src/master-data/*/dto/`.
// No OpenAPI artifact exists yet, so they are hand-written at this boundary.

export const RECORD_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const recordStatusSchema = z.enum(RECORD_STATUSES);
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/** Same regexes the backend DTOs enforce, so the client rejects what the server would. */
export const WEIGHT_DECIMAL = /^\d{1,15}(\.\d{1,3})?$/;
export const VOLUME_DECIMAL = /^\d{1,12}(\.\d{1,6})?$/;
export const POSITIVE_WEIGHT = /^(?!0+(\.0{1,3})?$)\d{1,15}(\.\d{1,3})?$/;
export const POSITIVE_VOLUME = /^(?!0+(\.0{1,6})?$)\d{1,12}(\.\d{1,6})?$/;

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  });
}

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

// =======================================================
// SHARED INPUT FRAGMENTS
// =======================================================
const latitude = z
  .string()
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= -90 && n <= 90;
  }, "Vĩ độ phải nằm trong khoảng -90 đến 90");

const longitude = z
  .string()
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= -180 && n <= 180;
  }, "Kinh độ phải nằm trong khoảng -180 đến 180");

/** Coordinates are optional and blank-tolerant; the form sends "" for untouched fields. */
export const optionalLatitude = z.union([z.literal(""), latitude]).optional();
export const optionalLongitude = z.union([z.literal(""), longitude]).optional();

export const addressFieldsSchema = {
  addressLine: z.string().min(1, "Địa chỉ không được để trống"),
  ward: z.string().max(100, "Phường/xã tối đa 100 ký tự").optional(),
  district: z.string().max(100, "Quận/huyện tối đa 100 ký tự").optional(),
  province: z
    .string()
    .min(1, "Tỉnh/thành phố không được để trống")
    .max(100, "Tỉnh/thành phố tối đa 100 ký tự"),
  postalCode: z.string().max(20, "Mã bưu chính tối đa 20 ký tự").optional(),
};

export const geoResponseFields = {
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
};

export const auditResponseFields = {
  status: recordStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
};
