export interface MutationScope {
  tenantId: string;
  userId: string;
}

export interface MutationIntent {
  requestId: string;
  fingerprint: string;
  payload: unknown;
  createdAt: string;
}

export interface MutationIntentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_PREFIX = "logix.transport.mutation.v1";

function createRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export class MutationIntentConflictError extends Error {
  constructor() {
    super("A pending mutation intent exists for different input.");
    this.name = "MutationIntentConflictError";
  }
}

export class MutationIntentStorageError extends Error {
  constructor() {
    super("The saved mutation intent cannot be safely recovered.");
    this.name = "MutationIntentStorageError";
  }
}

export function tripEditRecovery(payload: unknown): "read-back" | "replay" {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new MutationIntentStorageError();
  }
  if ("driverId" in payload) {
    if (typeof payload.driverId === "string") return "replay";
    if (payload.driverId !== null && payload.driverId !== undefined) {
      throw new MutationIntentStorageError();
    }
  }
  return "read-back";
}

function canonicalize(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`)
      .join(",")}}`;
  }
  throw new TypeError("Mutation input must be JSON-serializable.");
}

function storageKey(scope: MutationScope, operation: string): string {
  if (!scope.tenantId || !scope.userId || !operation.trim()) {
    throw new TypeError("A tenant, user, and operation are required.");
  }
  return [
    STORAGE_PREFIX,
    encodeURIComponent(scope.tenantId),
    encodeURIComponent(scope.userId),
    encodeURIComponent(operation),
  ].join(":");
}

function parseIntent(value: string): MutationIntent {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as MutationIntent).requestId !== "string" ||
      typeof (parsed as MutationIntent).fingerprint !== "string" ||
      !("payload" in parsed) ||
      typeof (parsed as MutationIntent).createdAt !== "string"
    ) {
      throw new Error();
    }
    return parsed as MutationIntent;
  } catch {
    throw new MutationIntentStorageError();
  }
}

export function getOrCreateMutationIntent(
  storage: MutationIntentStorage,
  scope: MutationScope,
  operation: string,
  input: unknown,
  makeRequestId: () => string = createRequestId,
  now: () => Date = () => new Date()
): MutationIntent {
  const key = storageKey(scope, operation);
  const fingerprint = canonicalize(input);
  const saved = storage.getItem(key);
  if (saved !== null) {
    const intent = parseIntent(saved);
    if (intent.fingerprint !== fingerprint) {
      throw new MutationIntentConflictError();
    }
    return intent;
  }

  const intent: MutationIntent = {
    requestId: makeRequestId(),
    fingerprint,
    payload: JSON.parse(fingerprint) as unknown,
    createdAt: now().toISOString(),
  };
  storage.setItem(key, JSON.stringify(intent));
  return intent;
}

export function getMutationIntent(
  storage: MutationIntentStorage,
  scope: MutationScope,
  operation: string
): MutationIntent | null {
  const saved = storage.getItem(storageKey(scope, operation));
  return saved === null ? null : parseIntent(saved);
}

export function completeMutationIntent(
  storage: MutationIntentStorage,
  scope: MutationScope,
  operation: string,
  requestId: string
): boolean {
  const key = storageKey(scope, operation);
  const saved = storage.getItem(key);
  if (saved === null) return false;
  if (parseIntent(saved).requestId !== requestId) return false;
  storage.removeItem(key);
  return true;
}
