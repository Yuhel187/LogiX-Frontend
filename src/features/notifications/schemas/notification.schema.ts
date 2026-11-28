import { z } from "zod";

export const NOTIFICATION_TYPES = {
  ORDER_PENDING_STOCK: "ORDER_PENDING_STOCK",
  TRIP_DISPATCHED: "TRIP_DISPATCHED",
  DELIVERY_FAILED: "DELIVERY_FAILED",
  DELIVERY_COMPLETED: "DELIVERY_COMPLETED",
  ADMIN_BROADCAST: "ADMIN_BROADCAST",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_SEVERITIES = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;

export type NotificationSeverity =
  (typeof NOTIFICATION_SEVERITIES)[keyof typeof NOTIFICATION_SEVERITIES];

export const notificationItemSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).catch("INFO"),
  title: z.string(),
  body: z.string(),
  entityType: z.string().nullable().optional().default(null),
  entityId: z.string().nullable().optional().default(null),
  link: z.string().nullable().optional().default(null),
  data: z.record(z.string(), z.unknown()).optional().default({}),
  createdAt: z.string(),
  readAt: z.string().nullable().optional().default(null),
  archivedAt: z.string().nullable().optional().default(null),
});

export type NotificationItem = z.infer<typeof notificationItemSchema>;

export const notificationCreatedEventSchema = notificationItemSchema.extend({
  tenantId: z.string().uuid().optional(),
});

export type NotificationCreatedEvent = z.infer<
  typeof notificationCreatedEventSchema
>;

export const notificationListResponseSchema = z.object({
  items: z.array(notificationItemSchema),
  nextCursor: z.string().nullable(),
});

export type NotificationListResponse = z.infer<
  typeof notificationListResponseSchema
>;

export const unreadCountSchema = z.object({
  count: z.number().int().nonnegative(),
});

export type UnreadCountResponse = z.infer<typeof unreadCountSchema>;

export const markAllReadResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export type MarkAllReadResponse = z.infer<typeof markAllReadResponseSchema>;

export interface ListNotificationsParams {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
  includeArchived?: boolean;
}

export function getSafeNotificationLink(
  link: string | null | undefined,
): string | null {
  if (typeof link !== "string") return null;
  if (!link.startsWith("/") || link.startsWith("//")) return null;
  return link;
}
