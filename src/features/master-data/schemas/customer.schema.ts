import { z } from "zod";
import {
  addressFieldsSchema,
  auditResponseFields,
  geoResponseFields,
  optionalLatitude,
  optionalLongitude,
  paginatedSchema,
} from "./common.schema";

export const customerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  taxCode: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  disabledAt: z.string().nullable(),
  disabledReason: z.string().nullable(),
  ...auditResponseFields,
});

export const paginatedCustomersSchema = paginatedSchema(customerSchema);

export const createCustomerSchema = z.object({
  code: z
    .string()
    .min(1, "Mã khách hàng không được để trống")
    .max(50, "Mã khách hàng tối đa 50 ký tự"),
  name: z
    .string()
    .min(1, "Tên khách hàng không được để trống")
    .max(200, "Tên khách hàng tối đa 200 ký tự"),
  taxCode: z.string().max(50, "Mã số thuế tối đa 50 ký tự").optional(),
  phone: z.string().max(30, "Số điện thoại tối đa 30 ký tự").optional(),
  email: z
    .union([z.literal(""), z.string().email("Email không đúng định dạng")])
    .optional(),
});

export const updateCustomerSchema = createCustomerSchema
  .omit({ code: true })
  .partial();

export const CUSTOMER_ADDRESS_TYPES = ["SHIPPING", "BILLING"] as const;
export const customerAddressTypeSchema = z.enum(CUSTOMER_ADDRESS_TYPES);
export type CustomerAddressType = (typeof CUSTOMER_ADDRESS_TYPES)[number];

/** The default flag is scoped per address type (one default SHIPPING, one default BILLING). */
export const customerAddressSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  addressType: customerAddressTypeSchema,
  label: z.string().nullable(),
  recipientName: z.string(),
  phone: z.string().nullable(),
  addressLine: z.string(),
  ward: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string(),
  postalCode: z.string().nullable(),
  deliveryNote: z.string().nullable(),
  isDefault: z.boolean(),
  ...geoResponseFields,
  ...auditResponseFields,
});

export const customerAddressListSchema = z.array(customerAddressSchema);

const deliveryNoteField = z
  .string()
  .max(500, "Ghi chú giao hàng tối đa 500 ký tự")
  .optional();

export const createCustomerAddressSchema = z.object({
  addressType: customerAddressTypeSchema.optional(),
  label: z.string().max(100, "Nhãn tối đa 100 ký tự").optional(),
  recipientName: z
    .string()
    .min(1, "Tên người nhận không được để trống")
    .max(200, "Tên người nhận tối đa 200 ký tự"),
  phone: z.string().max(30, "Số điện thoại tối đa 30 ký tự").optional(),
  ...addressFieldsSchema,
  latitude: optionalLatitude,
  longitude: optionalLongitude,
  deliveryNote: deliveryNoteField,
  isDefault: z.boolean().optional(),
});

/** addressType is immutable after creation, so it is not part of the update payload. */
export const updateCustomerAddressSchema = createCustomerAddressSchema
  .omit({ isDefault: true, addressType: true })
  .partial();

export type Customer = z.infer<typeof customerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerAddress = z.infer<typeof customerAddressSchema>;
export type CreateCustomerAddressInput = z.infer<
  typeof createCustomerAddressSchema
>;
export type UpdateCustomerAddressInput = z.infer<
  typeof updateCustomerAddressSchema
>;
