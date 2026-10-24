import { ApiError } from "@/lib/api";

export interface TenantSessionProfile {
  id: string;
  isSuperAdmin?: boolean;
  activeTenant?: { id: string } | null;
  tenants: { id: string }[];
}

export async function verifyTenantSession<
  P extends TenantSessionProfile,
  E extends { isSuperAdmin: boolean },
>(
  token: string,
  readProfile: (token: string) => Promise<P>,
  readPermissions: (token: string) => Promise<E>,
  expectedTenantId?: string,
  expectedUserId?: string,
) {
  if (!token) throw new ApiError(401, "Missing session", "UNAUTHORIZED");
  const [profile, permissions] = await Promise.all([
    readProfile(token),
    readPermissions(token),
  ]);
  if (
    (expectedTenantId !== undefined &&
      profile.activeTenant?.id !== expectedTenantId) ||
    (expectedUserId !== undefined && profile.id !== expectedUserId) ||
    (profile.activeTenant != null &&
      !profile.tenants.some(
        (tenant) => tenant.id === profile.activeTenant?.id,
      )) ||
    profile.isSuperAdmin !== permissions.isSuperAdmin
  ) {
    throw new ApiError(
      0,
      "Tenant context could not be verified",
      "CONTEXT_UNKNOWN",
    );
  }
  return { profile, permissions };
}

export function isDefinitiveSwitchRejection(cause: unknown) {
  return (
    cause instanceof ApiError &&
    [400, 401, 403, 404, 429].includes(cause.status)
  );
}
