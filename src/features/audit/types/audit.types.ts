import type {
  AUDIT_ACTOR_TYPES,
  AUDIT_OUTCOMES,
} from "../constants/audit-permissions";

export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export interface AuditLogItem {
  id: string;
  tenantId: string;
  actorId: string | null;
  actorType: AuditActorType | string;
  action: string;
  entityType: string;
  entityId: string | null;
  outcome: AuditOutcome | string;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  correlationId: string;
  causationId: string | null;
  sourceService: string;
  sourceEventId: string | null;
  occurredAt: string;
  ingestedAt: string;
  latencyMs: number;
}

export interface AuditLogsPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogsPage {
  items: AuditLogItem[];
  meta: AuditLogsPageMeta;
}

export interface AuditCorrelationChain {
  correlationId: string;
  total: number;
  items: AuditLogItem[];
}

export type AuditFilterParams = {
  actorId?: string;
  actorType?: AuditActorType;
  action?: string;
  entityType?: string;
  entityId?: string;
  outcome?: AuditOutcome;
  sourceService?: string;
  correlationId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type AuditDiffChangeType = "added" | "removed" | "changed" | "unchanged";

export interface AuditDiffEntry {
  path: string;
  changeType: AuditDiffChangeType;
  beforeValue: unknown;
  afterValue: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenForDiff(
  data: Record<string, unknown> | null,
  prefix = "",
): Map<string, unknown> {
  const result = new Map<string, unknown>();
  if (!data) return result;
  for (const [key, value] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value) && Object.keys(value).length > 0) {
      for (const [nestedPath, nestedVal] of flattenForDiff(value, path)) {
        result.set(nestedPath, nestedVal);
      }
    } else {
      result.set(path, value);
    }
  }
  return result;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function computeAuditDiffEntries(
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
): AuditDiffEntry[] {
  const beforeMap = flattenForDiff(beforeData);
  const afterMap = flattenForDiff(afterData);
  const allKeys = Array.from(
    new Set([...beforeMap.keys(), ...afterMap.keys()]),
  ).sort();

  return allKeys.map((path) => {
    const hasBefore = beforeMap.has(path);
    const hasAfter = afterMap.has(path);
    const beforeValue = beforeMap.get(path);
    const afterValue = afterMap.get(path);

    if (!hasBefore && hasAfter) {
      return { path, changeType: "added", beforeValue: undefined, afterValue };
    }
    if (hasBefore && !hasAfter) {
      return { path, changeType: "removed", beforeValue, afterValue: undefined };
    }
    if (!valuesEqual(beforeValue, afterValue)) {
      return { path, changeType: "changed", beforeValue, afterValue };
    }
    return { path, changeType: "unchanged", beforeValue, afterValue };
  });
}
