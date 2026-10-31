import { describe, expect, it } from "vitest";
import {
  completeMutationIntent,
  getMutationIntent,
  getOrCreateMutationIntent,
  MutationIntentConflictError,
  MutationIntentStorageError,
  tripEditRecovery,
  type MutationIntentStorage,
} from "./mutation-intent";

class MemoryStorage implements MutationIntentStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  corrupt(key: string): void {
    this.values.set(key, "{");
  }
}

const scope = { tenantId: "tenant-a", userId: "user-a" };
const requestId = () => "request-1";
const now = () => new Date("2026-10-25T00:00:00.000Z");

describe("transport mutation intent persistence", () => {
  it("uses read-back only for local edits and exact replay for Driver references", () => {
    expect(tripEditRecovery({ expectedVersion: 2, plannedStartAt: "date" })).toBe("read-back");
    expect(tripEditRecovery({ expectedVersion: 2, vehicleId: "vehicle" })).toBe("read-back");
    expect(tripEditRecovery({ expectedVersion: 2, driverId: null })).toBe("read-back");
    expect(tripEditRecovery({ expectedVersion: 2, driverId: "driver" })).toBe("replay");
    expect(tripEditRecovery({
      expectedVersion: 2,
      plannedStartAt: "date",
      vehicleId: null,
      driverId: "driver",
    })).toBe("replay");
    expect(() => tripEditRecovery(null)).toThrow(MutationIntentStorageError);
    expect(() => tripEditRecovery({ driverId: 3 })).toThrow(MutationIntentStorageError);
  });

  it("persists one request ID and reuses it only for the exact same input", () => {
    const storage = new MemoryStorage();
    const first = getOrCreateMutationIntent(
      storage,
      scope,
      "trip:trip-a:add-shipments",
      { shipmentIds: ["s1"], expectedVersion: 3 },
      requestId,
      now
    );
    const recovered = getOrCreateMutationIntent(
      storage,
      scope,
      "trip:trip-a:add-shipments",
      { expectedVersion: 3, shipmentIds: ["s1"] },
      () => "request-2",
      () => new Date()
    );

    expect(recovered).toEqual(first);
    expect(recovered.requestId).toBe("request-1");
    expect(recovered.payload).toEqual({
      expectedVersion: 3,
      shipmentIds: ["s1"],
    });

  });

  it("recovers a dispatch request with the original preview token and tenant scope", () => {
    const storage = new MemoryStorage();
    const operation = "trip:trip-a:dispatch";
    const body = {
      version: 4,
      previewToken: "signed-preview",
      confirmed: true,
    };
    const saved = getOrCreateMutationIntent(
      storage,
      scope,
      operation,
      body,
      requestId,
      now
    );

    expect(getMutationIntent(storage, scope, operation)).toEqual(saved);
    expect(saved.payload).toEqual(body);
    expect(getMutationIntent(
      storage,
      { ...scope, tenantId: "tenant-b" },
      operation
    )).toBeNull();
    expect(() =>
      getOrCreateMutationIntent(
        storage,
        scope,
        operation,
        { ...body, version: 5 },
        () => "new-request",
        now
      )
    ).toThrow(MutationIntentConflictError);
  });

  it("recovers the exact Driver outcome, actor-scoped preview, and request by tenant/user", () => {
    const storage = new MemoryStorage();
    const operation = "driver-trip:trip-a:stop:stop-a";
    const savedPayload = {
      action: "FAIL",
      command: {
        expectedTripVersion: 7,
        expectedStopVersion: 3,
        confirmed: true,
        previewToken: "original.preview.token",
        actingReason: "Covering assigned Driver",
        reason: "Recipient unavailable",
      },
    };
    const saved = getOrCreateMutationIntent(
      storage,
      scope,
      operation,
      savedPayload,
      requestId,
      now
    );
    const recovered = getOrCreateMutationIntent(
      storage,
      scope,
      operation,
      savedPayload,
      () => "request-2",
      now
    );

    expect(recovered).toEqual(saved);
    expect(recovered.payload).toEqual(savedPayload);
    expect(
      getMutationIntent(
        storage,
        { tenantId: "tenant-b", userId: scope.userId },
        operation
      )
    ).toBeNull();
    expect(
      getOrCreateMutationIntent(
        storage,
        { tenantId: scope.tenantId, userId: "admin-user" },
        operation,
        savedPayload,
        () => "request-3",
        now
      )
    ).toMatchObject({ requestId: "request-3" });
    expect(() =>
      getOrCreateMutationIntent(
        storage,
        scope,
        operation,
        { ...savedPayload, action: "DELIVER" },
        () => "request-4",
        now
      )
    ).toThrow(MutationIntentConflictError);
  });

  it("does not mint a new request ID after input changes or an uncertain outcome", () => {
    const storage = new MemoryStorage();
    const create = () =>
      getOrCreateMutationIntent(
        storage,
        scope,
        "trip:trip-a:cancel",
        { expectedVersion: 4, reason: "weather" },
        requestId,
        now
      );
    create();

    expect(() =>
      getOrCreateMutationIntent(
        storage,
        scope,
        "trip:trip-a:cancel",
        { expectedVersion: 5, reason: "weather" },
        () => "must-not-be-created",
        now
      )
    ).toThrow(MutationIntentConflictError);
    expect(getMutationIntent(storage, scope, "trip:trip-a:cancel")?.requestId).toBe(
      "request-1"
    );
  });

  it("isolates intents by tenant, user, and operation", () => {
    const storage = new MemoryStorage();
    const first = getOrCreateMutationIntent(
      storage,
      scope,
      "trip:trip-a:update",
      { expectedVersion: 1 },
      requestId,
      now
    );
    const otherTenant = getOrCreateMutationIntent(
      storage,
      { ...scope, tenantId: "tenant-b" },
      "trip:trip-a:update",
      { expectedVersion: 1 },
      () => "request-tenant-b",
      now
    );
    const otherUser = getOrCreateMutationIntent(
      storage,
      { ...scope, userId: "user-b" },
      "trip:trip-a:update",
      { expectedVersion: 1 },
      () => "request-user-b",
      now
    );
    const otherOperation = getOrCreateMutationIntent(
      storage,
      scope,
      "trip:trip-b:update",
      { expectedVersion: 1 },
      () => "request-trip-b",
      now
    );

    expect(first.requestId).toBe("request-1");
    expect(otherTenant.requestId).toBe("request-tenant-b");
    expect(otherUser.requestId).toBe("request-user-b");
    expect(otherOperation.requestId).toBe("request-trip-b");
  });

  it("removes only the confirmed request and refuses corrupted recovery state", () => {
    const storage = new MemoryStorage();
    const intent = getOrCreateMutationIntent(
      storage,
      scope,
      "trip:trip-a:update",
      { expectedVersion: 1 },
      requestId,
      now
    );

    expect(
      completeMutationIntent(
        storage,
        scope,
        "trip:trip-a:update",
        "different-request"
      )
    ).toBe(false);
    expect(
      completeMutationIntent(
        storage,
        scope,
        "trip:trip-a:update",
        intent.requestId
      )
    ).toBe(true);
    const saved = getOrCreateMutationIntent(
      storage,
      scope,
      "trip:trip-a:update",
      { expectedVersion: 2 },
      () => "request-2",
      now
    );
    expect(saved.requestId).toBe("request-2");

    storage.corrupt(
      "logix.transport.mutation.v1:tenant-a:user-a:trip%3Atrip-a%3Aupdate"
    );
    expect(() =>
      getMutationIntent(storage, scope, "trip:trip-a:update")
    ).toThrow(MutationIntentStorageError);
  });
});
