import { describe, expect, it } from "vitest";
import {
  canEditTransportTrip,
  canAccessDriverExperience,
  isDriverTripRoute,
  requiredTransportRoutePermission,
  TRANSPORT_PERMISSIONS,
} from "./transport-permissions";

describe("transport permission boundaries", () => {
  it("keeps trip read, create, and update grants independent", () => {
    const grants = new Set<string>([TRANSPORT_PERMISSIONS.tripRead]);
    const hasPermission = (permission: string) => grants.has(permission);

    expect(requiredTransportRoutePermission("/transport")).toBe(
      TRANSPORT_PERMISSIONS.tripRead
    );
    expect(requiredTransportRoutePermission("/transport/trip-1")).toBe(
      TRANSPORT_PERMISSIONS.tripRead
    );
    expect(requiredTransportRoutePermission("/transport/new")).toBe(
      TRANSPORT_PERMISSIONS.tripCreate
    );
    expect(hasPermission(TRANSPORT_PERMISSIONS.tripRead)).toBe(true);
    expect(hasPermission(TRANSPORT_PERMISSIONS.tripCreate)).toBe(false);
    expect(canEditTransportTrip(hasPermission)).toBe(false);
  });

  it("requires create and update permissions for their respective mutations", () => {
    const grants = new Set<string>([
      TRANSPORT_PERMISSIONS.tripCreate,
      TRANSPORT_PERMISSIONS.tripUpdate,
    ]);
    const hasPermission = (permission: string) => grants.has(permission);

    expect(hasPermission(TRANSPORT_PERMISSIONS.tripRead)).toBe(false);
    expect(requiredTransportRoutePermission("/transport/new")).toBe(
      TRANSPORT_PERMISSIONS.tripCreate
    );
    expect(hasPermission(TRANSPORT_PERMISSIONS.tripCreate)).toBe(true);
    expect(canEditTransportTrip(hasPermission)).toBe(true);
  });

  it("does not claim unrelated routes", () => {
    expect(requiredTransportRoutePermission("/forecast")).toBeNull();
    expect(requiredTransportRoutePermission("/routes")).toBe(
      TRANSPORT_PERMISSIONS.tripRead
    );
  });

  it("uses the permissions already named by the product contract", () => {
    expect(TRANSPORT_PERMISSIONS).toEqual({
      tripRead: "transport:trip:read",
      tripCreate: "transport:trip:create",
      tripUpdate: "transport:trip:update",
      tripDispatch: "transport:trip:dispatch",
      driverRead: "transport:driver:read",
      driverUpdate: "transport:driver:update",
      routeRead: "transport:route:read",
      routeApprove: "transport:route:approve",
      routeOptimize: "transport:route:optimize",
    });
  });

  it("allows the authenticated Driver permission or Super Admin only", () => {
    expect(canAccessDriverExperience(["transport:driver:read"], false)).toBe(true);
    expect(canAccessDriverExperience([], true)).toBe(true);
    expect(canAccessDriverExperience(["*"], false)).toBe(false);
    expect(canAccessDriverExperience(["transport:trip:read"], false)).toBe(false);
    expect(canAccessDriverExperience([], false)).toBe(false);
  });

  it("matches only the Driver trip route and its descendants", () => {
    expect(isDriverTripRoute("/driver/trips")).toBe(true);
    expect(isDriverTripRoute("/driver/trips/trip-1")).toBe(true);
    expect(isDriverTripRoute("/driver/trips-malformed")).toBe(false);
    expect(isDriverTripRoute("/transport")).toBe(false);
  });
});
