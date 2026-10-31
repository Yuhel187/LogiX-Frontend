import { describe, expect, it } from "vitest";
import {
  approveRouteInputSchema, manualRouteInputSchema, overrideRouteInputSchema,
  routePreviewInputSchema,
} from "./route.schema";

const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const selection = { expectedVersion: 3, planId: id, planVersion: 1, inputHash: "a".repeat(64) };
describe("Transport route request contracts", () => {
  it("requires unique bounded manual stop orders and exact version field", () => {
    expect(manualRouteInputSchema.parse({ requestId: id, expectedTripVersion: 3, orderedStopIds: [id, other] }))
      .toMatchObject({ expectedTripVersion: 3 });
    for (const orderedStopIds of [[], [id, id], Array(101).fill(id)]) {
      expect(manualRouteInputSchema.safeParse({ requestId: id, expectedTripVersion: 3, orderedStopIds }).success).toBe(false);
    }
    expect(manualRouteInputSchema.safeParse({ requestId: id, expectedVersion: 3, orderedStopIds: [id] }).success).toBe(false);
  });
  it("binds override order and reason together and rejects authority fields", () => {
    expect(routePreviewInputSchema.safeParse(selection).success).toBe(true);
    expect(routePreviewInputSchema.safeParse({ ...selection, orderedStopIds: [id] }).success).toBe(false);
    expect(routePreviewInputSchema.safeParse({ ...selection, reason: "Changed" }).success).toBe(false);
    expect(routePreviewInputSchema.safeParse({ ...selection, actorId: id }).success).toBe(false);
    expect(routePreviewInputSchema.safeParse({ ...selection, orderedStopIds: [id], reason: " " }).success).toBe(false);
  });
  it("requires explicit confirmation but preserves the exact token for expired-preview replay", () => {
    const input = { ...selection, requestId: other, previewToken: "original.token", confirmed: true };
    expect(approveRouteInputSchema.parse(input)).toEqual(input);
    expect(approveRouteInputSchema.safeParse({ ...input, confirmed: false }).success).toBe(false);
    expect(overrideRouteInputSchema.parse({ ...input, orderedStopIds: [id], reason: "Changed order" }).reason).toBe("Changed order");
  });
});
