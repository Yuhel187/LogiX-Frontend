import { z } from "zod";
import {
  BROADCAST_LIMITS,
  BROADCAST_STATUSES,
  type BroadcastStatus,
} from "../constants/notification-permissions";
import { NOTIFICATION_SEVERITIES, type NotificationSeverity } from "./notification.schema";

export const BROADCAST_RELATIVE_LINK_REGEX = /^\/(?!\/)[^\s\\<>]*$/;

export function isValidBroadcastLink(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length > BROADCAST_LIMITS.linkMax) return false;
  return BROADCAST_RELATIVE_LINK_REGEX.test(trimmed);
}

export const broadcastStatusSchema = z
  .enum([
    BROADCAST_STATUSES.QUEUED,
    BROADCAST_STATUSES.FANOUTING,
    BROADCAST_STATUSES.READY,
    BROADCAST_STATUSES.COMPLETED,
    BROADCAST_STATUSES.PARTIAL_FAILED,
    BROADCAST_STATUSES.FAILED,
  ])
  .catch(BROADCAST_STATUSES.QUEUED);

export const broadcastSeveritySchema = z
  .enum([
    NOTIFICATION_SEVERITIES.INFO,
    NOTIFICATION_SEVERITIES.WARNING,
    NOTIFICATION_SEVERITIES.CRITICAL,
  ])
  .catch(NOTIFICATION_SEVERITIES.INFO);

export const broadcastAudienceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ALL") }),
  z.object({
    kind: z.literal("ROLES"),
    roleIds: z.array(z.string().uuid()),
  }),
  z.object({
    kind: z.literal("USERS"),
    userIds: z.array(z.string().uuid()),
  }),
]);

export type BroadcastAudience = z.infer<typeof broadcastAudienceSchema>;

export interface CreateBroadcastPayload {
  title: string;
  body: string;
  severity: NotificationSeverity;
  audience: BroadcastAudience;
  link?: string | null;
}

export const createBroadcastResponseSchema = z.object({
  id: z.string().uuid(),
  status: broadcastStatusSchema,
});

export type CreateBroadcastResponse = z.infer<
  typeof createBroadcastResponseSchema
>;

export const broadcastHistoryItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  severity: broadcastSeveritySchema,
  audience: broadcastAudienceSchema,
  senderId: z.string().uuid(),
  status: broadcastStatusSchema,
  recipientCount: z.number().int().nonnegative(),
  deliveredCount: z.number().int().nonnegative(),
  readCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  lastError: z.string().optional(),
});

export type BroadcastHistoryItem = z.infer<typeof broadcastHistoryItemSchema>;

export const broadcastListResponseSchema = z.object({
  items: z.array(broadcastHistoryItemSchema),
  nextCursor: z.string().nullable(),
});

export type BroadcastListResponse = z.infer<typeof broadcastListResponseSchema>;

export interface ListBroadcastsParams {
  cursor?: string;
  limit?: number;
}

export function canonicalizeBroadcastAudience(
  audience: BroadcastAudience,
): BroadcastAudience {
  if (audience.kind === "ROLES") {
    return { kind: "ROLES", roleIds: [...new Set(audience.roleIds)].sort() };
  }
  if (audience.kind === "USERS") {
    return { kind: "USERS", userIds: [...new Set(audience.userIds)].sort() };
  }
  return { kind: "ALL" };
}

export function normalizeBroadcastLink(
  link: string | null | undefined,
): string | null {
  if (typeof link !== "string") return null;
  const trimmed = link.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildBroadcastPayloadFingerprint(
  payload: CreateBroadcastPayload,
): string {
  return JSON.stringify({
    title: payload.title.trim(),
    body: payload.body.trim(),
    severity: payload.severity,
    link: normalizeBroadcastLink(payload.link),
    audience: canonicalizeBroadcastAudience(payload.audience),
  });
}

export function isBroadcastInProgress(status: BroadcastStatus): boolean {
  return (
    status === BROADCAST_STATUSES.QUEUED ||
    status === BROADCAST_STATUSES.FANOUTING ||
    status === BROADCAST_STATUSES.READY
  );
}
