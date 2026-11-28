import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  AUDIT_DEFAULT_LIMIT,
  AUDIT_DEFAULT_PAGE,
} from "../constants/audit-permissions";
import type {
  AuditCorrelationChain,
  AuditFilterParams,
  AuditLogItem,
  AuditLogsPage,
} from "../types/audit.types";

const BASE_URL = `${apiBaseUrl}/audit-logs`;

function asRecordOrNull(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeAuditLogItem(raw: unknown): AuditLogItem {
  const obj = asRecordOrNull(raw) ?? {};
  return {
    id: String(obj.id ?? ""),
    tenantId: String(obj.tenantId ?? ""),
    actorId: typeof obj.actorId === "string" ? obj.actorId : null,
    actorType: String(obj.actorType ?? "SYSTEM"),
    action: String(obj.action ?? ""),
    entityType: String(obj.entityType ?? ""),
    entityId: typeof obj.entityId === "string" ? obj.entityId : null,
    outcome: String(obj.outcome ?? "SUCCESS"),
    beforeData: asRecordOrNull(obj.beforeData),
    afterData: asRecordOrNull(obj.afterData),
    metadata: asRecordOrNull(obj.metadata) ?? {},
    correlationId: String(obj.correlationId ?? ""),
    causationId: typeof obj.causationId === "string" ? obj.causationId : null,
    sourceService: String(obj.sourceService ?? ""),
    sourceEventId:
      typeof obj.sourceEventId === "string" ? obj.sourceEventId : null,
    occurredAt: String(obj.occurredAt ?? ""),
    ingestedAt: String(obj.ingestedAt ?? ""),
    latencyMs:
      typeof obj.latencyMs === "number" && Number.isFinite(obj.latencyMs)
        ? Math.max(0, obj.latencyMs)
        : 0,
  };
}

export async function listAuditLogsApi(
  params: AuditFilterParams = {},
  signal?: AbortSignal,
): Promise<AuditLogsPage> {
  const response = await authFetch(`${BASE_URL}${toQueryString(params)}`, {
    method: "GET",
    signal,
  });
  const payload = asRecordOrNull(await handleResponse<unknown>(response)) ?? {};
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const rawMeta = asRecordOrNull(payload.meta) ?? {};

  return {
    items: rawItems.map(normalizeAuditLogItem),
    meta: {
      page:
        typeof rawMeta.page === "number" ? rawMeta.page : AUDIT_DEFAULT_PAGE,
      limit:
        typeof rawMeta.limit === "number" ? rawMeta.limit : AUDIT_DEFAULT_LIMIT,
      total: typeof rawMeta.total === "number" ? rawMeta.total : 0,
      totalPages:
        typeof rawMeta.totalPages === "number" ? rawMeta.totalPages : 0,
    },
  };
}

export async function getAuditLogByIdApi(
  id: string,
  signal?: AbortSignal,
): Promise<AuditLogItem> {
  const response = await authFetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: "GET",
    signal,
  });
  return normalizeAuditLogItem(await handleResponse<unknown>(response));
}

export async function getAuditCorrelationChainApi(
  correlationId: string,
  signal?: AbortSignal,
): Promise<AuditCorrelationChain> {
  const response = await authFetch(
    `${BASE_URL}/correlations/${encodeURIComponent(correlationId)}`,
    {
      method: "GET",
      signal,
    },
  );
  const payload = asRecordOrNull(await handleResponse<unknown>(response)) ?? {};
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  return {
    correlationId: String(payload.correlationId ?? correlationId),
    total:
      typeof payload.total === "number" ? payload.total : rawItems.length,
    items: rawItems.map(normalizeAuditLogItem),
  };
}
