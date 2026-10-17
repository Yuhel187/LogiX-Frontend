import type { OrderStatus } from "../schemas/order.schema";
import { ORDER_PERMISSIONS } from "../constants/order.constants";

type PermissionCheck = (permission: string) => boolean;

export function canEditOrder(
  status: OrderStatus,
  hasPermission: PermissionCheck,
  cancellationRequestedAt: string | null
): boolean {
  return !cancellationRequestedAt && (status === "DRAFT" || status === "PENDING_STOCK") &&
    hasPermission(ORDER_PERMISSIONS.update);
}

export function canCancelOrder(
  status: OrderStatus,
  hasPermission: PermissionCheck,
  cancellationRequestedAt: string | null
): boolean {
  return !cancellationRequestedAt && (status === "DRAFT" || status === "PENDING_STOCK" || status === "CONFIRMED") &&
    hasPermission(ORDER_PERMISSIONS.cancel);
}

export function canConfirmOrder(
  status: OrderStatus, hasPermission: PermissionCheck, cancellationRequestedAt: string | null
): boolean {
  return !cancellationRequestedAt && (status === "DRAFT" || status === "PENDING_STOCK") &&
    hasPermission(ORDER_PERMISSIONS.approve);
}

export function canCreateOrder(hasPermission: PermissionCheck): boolean {
  return hasPermission(ORDER_PERMISSIONS.create);
}
