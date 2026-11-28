export const NOTIFICATION_BROADCAST_PERMISSIONS = {
  SEND: "notification:broadcast:send",
  READ: "notification:broadcast:read",
} as const;

export const BROADCAST_STATUSES = {
  QUEUED: "QUEUED",
  FANOUTING: "FANOUTING",
  READY: "READY",
  COMPLETED: "COMPLETED",
  PARTIAL_FAILED: "PARTIAL_FAILED",
  FAILED: "FAILED",
} as const;

export type BroadcastStatus =
  (typeof BROADCAST_STATUSES)[keyof typeof BROADCAST_STATUSES];

export const BROADCAST_AUDIENCE_KINDS = {
  ALL: "ALL",
  ROLES: "ROLES",
  USERS: "USERS",
} as const;

export type BroadcastAudienceKind =
  (typeof BROADCAST_AUDIENCE_KINDS)[keyof typeof BROADCAST_AUDIENCE_KINDS];

export const BROADCAST_LIMITS = {
  titleMax: 200,
  bodyMax: 4000,
  linkMax: 500,
  maxExplicitUsers: 5000,
  defaultPageSize: 20,
} as const;

export const BROADCAST_LINK_PRESETS = [
  "/dashboard",
  "/orders",
  "/shipments",
  "/transport",
  "/inventory",
  "/settings",
] as const;
