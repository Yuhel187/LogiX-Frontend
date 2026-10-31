export const TRANSPORT_PERMISSIONS = {
  tripRead: "transport:trip:read",
  tripCreate: "transport:trip:create",
  tripUpdate: "transport:trip:update",
  tripDispatch: "transport:trip:dispatch",
  driverRead: "transport:driver:read",
  driverUpdate: "transport:driver:update",
  routeRead: "transport:route:read",
  routeApprove: "transport:route:approve",
  routeOptimize: "transport:route:optimize",
} as const;

export function requiredTransportRoutePermission(
  pathname: string
): string | null {
  if (/^\/routes(?:\/|$)/.test(pathname)) {
    return TRANSPORT_PERMISSIONS.tripRead;
  }
  if (!/^\/transport(?:\/|$)/.test(pathname)) return null;
  if (/^\/transport\/new\/?$/.test(pathname)) {
    return TRANSPORT_PERMISSIONS.tripCreate;
  }
  return TRANSPORT_PERMISSIONS.tripRead;
}

export function canEditTransportTrip(
  hasPermission: (permission: string) => boolean
): boolean {
  return hasPermission(TRANSPORT_PERMISSIONS.tripUpdate);
}

export function canAccessDriverExperience(
  permissions: readonly string[],
  isSuperAdmin: boolean
): boolean {
  return (
    isSuperAdmin ||
    permissions.includes(TRANSPORT_PERMISSIONS.driverRead)
  );
}

export function isDriverTripRoute(pathname: string): boolean {
  return /^\/driver\/trips(?:\/|$)/.test(pathname);
}
