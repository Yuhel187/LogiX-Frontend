import { describe, expect, it } from "vitest";
import {
  createDriverSchema,
  driverSchema,
  eligibleDriverUserSchema,
  paginatedDriversSchema,
  paginatedEligibleDriverUsersSchema,
  updateDriverSchema,
} from "./driver.schema";

const driverView = {
  id: "driver-1",
  tenantId: "tenant-1",
  code: "DRV-001",
  userId: "member-1",
  displayName: "Nguyen Van A",
  licenseNumber: "LIC-001",
  licenseExpiry: "2028-02-29",
  phone: null,
  status: "ACTIVE",
  version: 4,
  createdAt: "2026-10-25T00:00:00.000Z",
  updatedAt: "2026-10-25T00:00:00.000Z",
};

describe("Driver contract schemas", () => {
  it("parses the complete Driver view and paginated list contract", () => {
    expect(driverSchema.parse(driverView)).toEqual(driverView);
    expect(
      paginatedDriversSchema.parse({
        items: [driverView],
        page: 1,
        pageSize: 20,
        total: 1,
      }).items
    ).toEqual([driverView]);
  });

  it("rejects invalid status, expiry date, and unsafe versions", () => {
    expect(
      driverSchema.safeParse({ ...driverView, status: "SUSPENDED" }).success
    ).toBe(false);
    expect(
      driverSchema.safeParse({ ...driverView, licenseExpiry: "2026-02-29" })
        .success
    ).toBe(false);
    expect(
      driverSchema.safeParse({ ...driverView, version: Number.MAX_SAFE_INTEGER + 1 })
        .success
    ).toBe(false);
  });

  it("accepts the eligible-user DTO without guessing role or permission fields", () => {
    const user = {
      id: "member-1",
      displayName: "Nguyen Van A",
      email: "driver@example.test",
      status: "ACTIVE",
    };
    expect(eligibleDriverUserSchema.parse(user)).toEqual(user);
    expect(
      paginatedEligibleDriverUsersSchema.parse({
        items: [user],
        page: 1,
        pageSize: 20,
        total: 1,
      }).items
    ).toEqual([user]);
    expect(
      eligibleDriverUserSchema.safeParse({ ...user, status: undefined }).success
    ).toBe(false);
    expect(
      eligibleDriverUserSchema.safeParse({ ...user, status: "INACTIVE" }).success
    ).toBe(false);
  });

  it("validates create fields and the actual ISO calendar date", () => {
    const input = {
      code: " DRV-002 ",
      userId: "member-2",
      licenseNumber: " LIC-002 ",
      licenseExpiry: "2028-02-29",
      phone: "+84 900 000 000",
    };
    expect(createDriverSchema.parse(input)).toEqual({
      ...input,
      code: "DRV-002",
      licenseNumber: "LIC-002",
    });
    expect(
      createDriverSchema.safeParse({ ...input, licenseExpiry: "2026-02-29" })
        .success
    ).toBe(false);
    expect(createDriverSchema.safeParse({ ...input, phone: "x".repeat(31) }).success)
      .toBe(false);
  });

  it("requires optimistic version and prevents changing immutable associations", () => {
    expect(
      updateDriverSchema.safeParse({
        licenseNumber: "LIC-003",
        licenseExpiry: "2029-01-01",
      }).success
    ).toBe(false);
    expect(
      updateDriverSchema.parse({
        version: 3,
        code: "DRV-CHANGED",
      })
    ).toEqual({ version: 3, code: "DRV-CHANGED" });
    expect(
      updateDriverSchema.safeParse({
        version: 3,
        userId: "member-other",
      }).success
    ).toBe(false);
    expect(
      updateDriverSchema.parse({
        version: 3,
        phone: null,
      })
    ).toEqual({ version: 3, phone: null });
  });
});
