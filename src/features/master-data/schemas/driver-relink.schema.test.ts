import { describe, expect, it } from "vitest";
import { driverRelinkPreviewSchema, relinkDriverUserSchema } from "./driver.schema";

const input = {
  version: 4,
  expectedUserId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  reason: "  Correct mistaken link  ",
};

describe("Driver relink schemas", () => {
  it("accepts distinct UUID accounts, positive version and trims reason", () => {
    expect(relinkDriverUserSchema.parse(input)).toEqual({
      ...input, reason: "Correct mistaken link",
    });
    expect(relinkDriverUserSchema.safeParse({
      ...input, reason: "x".repeat(1000),
    }).success).toBe(true);
  });

  it.each([
    ["reason", "", "reasonRequired"],
    ["reason", " \n ", "reasonRequired"],
    ["reason", "x".repeat(1001), "reasonTooLong"],
    ["userId", input.expectedUserId, "differentUser"],
    ["userId", "", "userRequired"],
    ["userId", "not-a-uuid", "userRequired"],
  ])("localizes invalid %s (%s) with %s", (field, value, message) => {
    const result = relinkDriverUserSchema.safeParse({ ...input, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: [field], message: `masterData.driver.validation.${message}`,
        }),
      ]));
    }
  });

  it.each([
    { version: 0 }, { version: -1 }, { version: 1.5 },
    { version: Number.MAX_SAFE_INTEGER + 1 },
    { expectedUserId: "not-a-uuid" }, { tenantId: "invented-field" },
  ])("rejects invalid or unaccepted request fields %j", (change) => {
    expect(relinkDriverUserSchema.safeParse({ ...input, ...change }).success).toBe(false);
  });

  it("requires the complete backend preview identity and reason", () => {
    const preview = {
      driverId: "33333333-3333-4333-8333-333333333333",
      version: 4,
      previousUserId: input.expectedUserId,
      userId: input.userId,
      previousDisplayName: "Old member",
      displayName: "New member",
      reason: "Correct mistaken link",
    };
    expect(driverRelinkPreviewSchema.parse(preview)).toEqual(preview);
    for (const key of Object.keys(preview)) {
      const invalid: Record<string, unknown> = { ...preview };
      delete invalid[key];
      expect(driverRelinkPreviewSchema.safeParse(invalid).success, key).toBe(false);
    }
  });
});
