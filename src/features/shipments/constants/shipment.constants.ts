import type { LogisticsStatus } from "@/components/shared/status-badge";
import type { ShipmentStatus } from "../schemas/shipment.schema";

export const SHIPMENT_PERMISSIONS = {
  read: "fulfillment:shipment:read",
  update: "fulfillment:shipment:update",
  dispatch: "fulfillment:shipment:dispatch",
  complete: "fulfillment:shipment:complete",
} as const;
export const SHIPMENT_PAGE_SIZE = 20;
export const SHIPMENT_FAILURE_MAX_LENGTH = 1_000;
export const SHIPMENT_ACTIONS = [
  "start-picking",
  "mark-ready",
  "dispatch",
  "mark-delivered",
  "mark-failed",
] as const;
export type ShipmentAction = (typeof SHIPMENT_ACTIONS)[number];
export const SHIPMENT_STATUS_TONE: Record<ShipmentStatus, LogisticsStatus> = {
  PENDING_PICK: "pending",
  PICKING: "processing",
  READY_TO_SHIP: "in_stock",
  DISPATCHED: "in_transit",
  DELIVERED: "delivered",
  FAILED: "delayed",
  CANCELED: "cancelled",
};
