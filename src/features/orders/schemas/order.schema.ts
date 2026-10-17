import { z } from "zod";

export const ORDER_STATUSES = [
  "DRAFT",
  "PENDING_STOCK",
  "CONFIRMED",
  "PICKING",
  "READY_TO_SHIP",
  "IN_DELIVERY",
  "DELIVERY_FAILED",
  "COMPLETED",
  "CANCELED",
] as const;

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

const decimalString = z.string();

export const orderSummarySchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: orderStatusSchema,
  customerId: z.string(),
  customerCode: z.string(),
  customerName: z.string(),
  warehouseId: z.string(),
  warehouseCode: z.string(),
  warehouseName: z.string(),
  currency: z.string(),
  totalQuantity: decimalString,
  totalWeight: decimalString,
  totalVolume: decimalString,
  createdAt: z.string(),
  updatedAt: z.string(),
  pendingSince: z.string().nullable(),
  cancellationRequestedAt: z.string().nullable(),
  version: z.number().int(),
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const customerSnapshotSchema = z.object({
  customerId: z.string(),
  customerVersion: z.number().int(),
  code: z.string(),
  name: z.string(),
  taxCode: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
});
export type CustomerSnapshot = z.infer<typeof customerSnapshotSchema>;

export const deliveryAddressSnapshotSchema = z.object({
  addressId: z.string(),
  addressVersion: z.number().int(),
  addressType: z.string(),
  label: z.string().nullish(),
  recipientName: z.string().nullish(),
  phone: z.string().nullish(),
  addressLine: z.string(),
  ward: z.string().nullish(),
  district: z.string().nullish(),
  province: z.string().nullish(),
  postalCode: z.string().nullish(),
  latitude: z.string().nullish(),
  longitude: z.string().nullish(),
  deliveryNote: z.string().nullish(),
});
export type DeliveryAddressSnapshot = z.infer<
  typeof deliveryAddressSnapshotSchema
>;

export const warehouseSnapshotSchema = z.object({
  warehouseId: z.string(),
  warehouseVersion: z.number().int(),
  code: z.string(),
  name: z.string(),
  addressLine: z.string().nullish(),
  ward: z.string().nullish(),
  district: z.string().nullish(),
  province: z.string().nullish(),
  postalCode: z.string().nullish(),
  latitude: z.string().nullish(),
  longitude: z.string().nullish(),
});
export type WarehouseSnapshot = z.infer<typeof warehouseSnapshotSchema>;

export const orderLineSchema = z.object({
  id: z.string(),
  lineNumber: z.number().int(),
  productId: z.string(),
  skuSnapshot: z.string(),
  productNameSnapshot: z.string(),
  unitSnapshot: z.string(),
  quantity: decimalString,
  unitWeight: decimalString,
  unitVolume: decimalString,
});
export type OrderLine = z.infer<typeof orderLineSchema>;

export const orderDetailSchema = orderSummarySchema.extend({
  deliveryAddressId: z.string(),
  orderSource: z.string(),
  confirmedAt: z.string().nullable(),
  reservationGroupId: z.string().nullable(),
  canceledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
  customerSnapshot: customerSnapshotSchema,
  deliveryAddressSnapshot: deliveryAddressSnapshotSchema,
  warehouseSnapshot: warehouseSnapshotSchema,
  lines: z.array(orderLineSchema),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

const shortageItemSchema = z.object({
  productId: z.string().uuid(),
  required: z.string().regex(/^\d{1,15}(?:\.\d{1,3})?$/),
  available: z.string().regex(/^\d{1,15}(?:\.\d{1,3})?$/),
});
export const confirmationPreviewSchema = z.object({
  checkedAt: z.string(),
  version: z.number().int().positive(),
  lines: shortageItemSchema.extend({ sufficient: z.boolean() }).array(),
});
export type ConfirmationPreview = z.infer<typeof confirmationPreviewSchema>;
export const orderShortageSchema = shortageItemSchema.extend({
  id: z.string().uuid(), warehouseId: z.string().uuid(), detectedAt: z.string(),
});
export type OrderShortage = z.infer<typeof orderShortageSchema>;

export const orderHistoryEntrySchema = z.object({
  id: z.string(),
  fromStatus: orderStatusSchema.nullable(),
  toStatus: orderStatusSchema,
  reason: z.string().nullable(),
  actorId: z.string().nullable(),
  correlationId: z.string(),
  orderVersion: z.number().int(),
  occurredAt: z.string(),
});
export type OrderHistoryEntry = z.infer<typeof orderHistoryEntrySchema>;

export const orderPageSchema = z.object({
  items: z.array(orderSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type OrderPage = z.infer<typeof orderPageSchema>;

/** Mirrors the backend quantity rule: positive, ≤15 integer and ≤3 fraction digits. */
export const ORDER_QUANTITY_PATTERN =
  /^(?!0+(?:\.0+)?$)\d{1,15}(?:\.\d{1,3})?$/;

export const CANCEL_REASON_MAX_LENGTH = 500;

export interface OrderLineInput {
  productId: string;
  quantity: string;
}

export interface CreateOrderInput {
  customerId: string;
  deliveryAddressId: string;
  warehouseId: string;
  currency: string;
  lines: OrderLineInput[];
}

export type UpdateOrderInput = Partial<CreateOrderInput> & { version: number };

export interface CancelOrderInput {
  version: number;
  reason: string;
}

export interface ListOrdersParams {
  q?: string;
  customerId?: string;
  warehouseId?: string;
  statuses?: OrderStatus[];
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
}
