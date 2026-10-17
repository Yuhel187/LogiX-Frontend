import { z } from "zod";

// Mirrors fulfillment-service ShipmentQueryService/DTOs and Prisma shipmentView.
export const SHIPMENT_STATUSES = [
  "PENDING_PICK",
  "PICKING",
  "READY_TO_SHIP",
  "DISPATCHED",
  "DELIVERED",
  "FAILED",
  "CANCELED",
] as const;
export const shipmentStatusSchema = z.enum(SHIPMENT_STATUSES);
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;
const decimal = z.string().regex(/^\d+(?:\.\d+)?$/);
const version = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const intentSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["PENDING", "COMPLETED", "REJECTED"]),
  orderVersion: version,
  shipmentVersion: version,
  actorId: z.string().uuid(),
  rejectionReason: z.string().nullable(),
});
export const shipmentSummarySchema = z.object({
  id: z.string().uuid(),
  shipmentNumber: z.string(),
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  warehouseId: z.string().uuid(),
  reservationGroupId: z.string().uuid(),
  status: shipmentStatusSchema,
  version,
  totalWeight: decimal,
  totalVolume: decimal,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  readyAt: z.string().datetime().nullable(),
  dispatchIssuedAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
  failureReason: z.string().nullable(),
  customerSnapshot: z.object({
    customerId: z.string().uuid(),
    code: z.string(),
    name: z.string(),
  }),
  warehouseSnapshot: z.object({
    warehouseId: z.string().uuid(),
    code: z.string(),
    name: z.string(),
  }),
  deliveryAddressSnapshot: z.object({
    addressId: z.string().uuid(),
    recipientName: z.string(),
    phone: z.string().nullable(),
    addressLine: z.string(),
    ward: z.string().nullable(),
    district: z.string().nullable(),
    province: z.string(),
    deliveryNote: z.string().nullable(),
  }),
  dispatchIntent: intentSchema.nullable(),
});
export type ShipmentSummary = z.infer<typeof shipmentSummarySchema>;
export const shipmentDetailSchema = shipmentSummarySchema.extend({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      orderLineId: z.string().uuid(),
      productId: z.string().uuid(),
      skuSnapshot: z.string(),
      productNameSnapshot: z.string(),
      unitSnapshot: z.string(),
      quantity: decimal,
      weight: decimal,
      volume: decimal,
    })
  ),
  statusHistory: z.array(
    z.object({
      id: z.string().uuid(),
      fromStatus: shipmentStatusSchema.nullable(),
      toStatus: shipmentStatusSchema,
      shipmentVersion: version,
      occurredAt: z.string().datetime(),
      actorId: z.string().uuid().nullable(),
      reason: z.string().nullable(),
    })
  ),
});
export type ShipmentDetail = z.infer<typeof shipmentDetailSchema>;
export const shipmentPageSchema = z.object({
  items: z.array(shipmentSummarySchema),
  total: z.number().int().nonnegative(),
  page: version,
  pageSize: version,
});
export type ShipmentPage = z.infer<typeof shipmentPageSchema>;
export const dispatchPreviewSchema = z.object({
  shipmentId: z.string().uuid(),
  shipmentNumber: z.string(),
  orderId: z.string().uuid(),
  version,
  orderVersion: version,
  reservationGroupId: z.string().uuid(),
});
export type DispatchPreview = z.infer<typeof dispatchPreviewSchema>;
export interface DispatchAttempt {
  preview: DispatchPreview;
  requestId: string;
}
export interface DispatchInput {
  version: number;
  orderVersion: number;
  requestId: string;
  confirmed: true;
}
export interface ShipmentListParams {
  warehouseId?: string;
  orderId?: string;
  status?: ShipmentStatus;
  page?: number;
  pageSize?: number;
  createdFrom?: string;
  createdTo?: string;
}
