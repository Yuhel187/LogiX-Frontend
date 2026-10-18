import type { LogisticsStatus } from "@/components/shared/status-badge";
import type { OrderStatus } from "../schemas/order.schema";

/**
 * MVP is single-currency (BRD BR-ORD-001). The tenant has no configured
 * currency yet, so the form sends this named constant instead of asking.
 */
export const DEFAULT_ORDER_CURRENCY = "VND";

export const ORDER_PERMISSIONS = {
  read: "order:sales-order:read",
  create: "order:sales-order:create",
  update: "order:sales-order:update",
  cancel: "order:sales-order:cancel",
  approve: "order:sales-order:approve",
} as const;

/** Badge tone per status; the label always comes from `orders.status.*`. */
export const ORDER_STATUS_TONE: Record<OrderStatus, LogisticsStatus> = {
  DRAFT: "draft",
  PENDING_STOCK: "pending",
  CONFIRMED: "confirmed",
  PICKING: "processing",
  READY_TO_SHIP: "in_stock",
  IN_DELIVERY: "in_transit",
  DELIVERY_FAILED: "delayed",
  COMPLETED: "delivered",
  CANCELED: "cancelled",
};

export const ORDER_LIST_PAGE_SIZE = 20;

export const ORDER_SEARCH_MAX_LENGTH = 50;
