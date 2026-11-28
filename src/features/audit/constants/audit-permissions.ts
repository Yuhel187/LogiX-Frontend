export const AUDIT_PERMISSIONS = {
  LOG_READ: "audit:log:read",
} as const;

export const AUDIT_OUTCOMES = ["SUCCESS", "DENIED", "FAILED"] as const;
export const AUDIT_ACTOR_TYPES = ["USER", "SYSTEM", "AGENT"] as const;

export const AUDIT_SOURCE_SERVICES = [
  "identity-service",
  "inventory-service",
  "order-service",
  "fulfillment-service",
  "transport-service",
  "agent-service",
] as const;

export const AUDIT_DEFAULT_PAGE = 1;
export const AUDIT_DEFAULT_LIMIT = 20;
export const AUDIT_REDACTED_MARKER = "[REDACTED]";
