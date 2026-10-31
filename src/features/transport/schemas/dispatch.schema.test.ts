import { describe, expect, it } from "vitest";
import {
  dispatchCommandSchema,
  dispatchIntentPayloadSchema,
  dispatchOperationSchema,
  dispatchPreviewSchema,
} from "./dispatch.schema";

const tripId = "00000000-0000-4000-8000-000000000001";
const requestId = "00000000-0000-4000-8000-000000000002";
const planId = "00000000-0000-4000-8000-000000000003";
const instant = "2026-10-25T00:00:00.000Z";

describe("Dispatch contracts", () => {
  it("requires a signed preview and preserves its exact immutable binding", () => {
    const preview = {
      tripId,
      version: 4,
      approvedPlanId: planId,
      inputHash: "a".repeat(64),
      dispatchVersion: 1,
      shipmentCount: 2,
      previewToken: "signed.preview",
      expiresAt: instant,
    };
    expect(dispatchPreviewSchema.parse(preview)).toEqual(preview);
    expect(dispatchPreviewSchema.safeParse({ ...preview, extra: true }).success)
      .toBe(false);
  });

  it("accepts only the exact confirmed dispatch body, including on replay", () => {
    const saved = {
      version: 4,
      previewToken: "signed.preview",
      confirmed: true as const,
    };
    expect(dispatchIntentPayloadSchema.parse(saved)).toEqual(saved);
    expect(dispatchCommandSchema.parse({ requestId, ...saved })).toEqual({
      requestId,
      ...saved,
    });
    expect(dispatchCommandSchema.safeParse({
      requestId,
      ...saved,
      version: 0,
    }).success).toBe(false);
    expect(dispatchCommandSchema.safeParse({
      requestId,
      ...saved,
      confirmationLabel: "dispatch",
    }).success).toBe(false);
  });

  it("keeps a durable receipted operation pending until trip commit is complete", () => {
    const operation = {
      tripId,
      requestId,
      kind: "DISPATCH",
      status: "PENDING",
      stage: "RECEIPTED",
      payloadHash: "b".repeat(64),
      version: 5,
      result: null,
      error: null,
      nextRetryAt: instant,
      results: [{ shipmentId: planId, state: "GRANTED" }],
    };
    expect(dispatchOperationSchema.parse(operation)).toEqual(operation);
    expect(dispatchOperationSchema.safeParse({
      ...operation,
      kind: "CANCEL",
    }).success).toBe(false);
  });
});
