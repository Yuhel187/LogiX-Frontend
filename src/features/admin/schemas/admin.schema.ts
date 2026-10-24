import { z } from "zod";

// Authority: BE/docs/plan_ghi_ro_so_task_backlog/super-admin-organization-user-management-spec.md, section 4, contract v1.
export const ORGANIZATION_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
] as const;
export const USER_STATUSES = ["ACTIVE", "LOCKED", "DISABLED"] as const;
export const ADMIN_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_MAX_PAGE_SIZE = 100;
export const ADMIN_SEARCH_MAX_LENGTH = 200;
export const ADMIN_PAGE_SIZES = [10, 20, 50, 100] as const;
const MAX_DATABASE_OFFSET = 2_147_483_647;

const timestamp = z.iso.datetime();
const organizationSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  status: z.enum(ORGANIZATION_STATUSES),
  logoUrl: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
  owner: z
    .object({
      displayName: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
});
const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  displayName: z.string(),
  phoneNumber: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  status: z.enum(USER_STATUSES),
  isSuperAdmin: z.boolean(),
  lastLoginAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
  tenantCount: z.number().int().nonnegative(),
});
function pageSchema<T extends z.ZodType>(item: T) {
  return z
    .object({
      items: z.array(item),
      page: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      pageSize: z.number().int().min(1).max(ADMIN_MAX_PAGE_SIZE),
      total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    })
    .refine(
      (value) =>
        value.items.length <= value.pageSize &&
        value.items.length <= value.total,
    );
}
export const organizationPageSchema = pageSchema(organizationSchema);
export const userPageSchema = pageSchema(userSchema);

const integerParameter = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
export function adminQuerySchema(kind: "organizations" | "users") {
  return z
    .object({
      q: z.string().trim().max(ADMIN_SEARCH_MAX_LENGTH).default(""),
      status: z
        .union([
          z.literal(""),
          z.enum(
            kind === "organizations" ? ORGANIZATION_STATUSES : USER_STATUSES,
          ),
        ])
        .default(""),
      page: integerParameter.default(1),
      pageSize: integerParameter
        .pipe(z.number().max(ADMIN_MAX_PAGE_SIZE))
        .default(ADMIN_DEFAULT_PAGE_SIZE),
    })
    .refine(
      (value) => (value.page - 1) * value.pageSize <= MAX_DATABASE_OFFSET,
    );
}
