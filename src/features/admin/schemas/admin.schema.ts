import { z } from "zod";

// Authority: BE/docs/plan_ghi_ro_so_task_backlog/super-admin-organization-user-management-spec.md, section 4, contract v1.
export const ORGANIZATION_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
] as const;
export const USER_STATUSES = ["ACTIVE", "LOCKED", "DISABLED"] as const;
export const CONTACT_NEED_CATEGORIES = [
  "ORDER_FULFILLMENT",
  "INVENTORY_WAREHOUSE",
  "TRANSPORT_ROUTE",
  "DRIVER_DELIVERY",
  "DEMAND_FORECAST",
  "ENTERPRISE_RBAC",
  "OTHER",
] as const;
export const CONTACT_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "ARCHIVED",
] as const;
export const CONTACT_LEAD_MAX_NAME_LENGTH = 200;
export const CONTACT_LEAD_MAX_EMAIL_LENGTH = 320;
export const CONTACT_LEAD_MAX_PHONE_LENGTH = 50;
export const CONTACT_LEAD_MAX_COMPANY_LENGTH = 255;
export const CONTACT_LEAD_MAX_OTHER_DETAIL_LENGTH = 2000;
export const CONTACT_LEAD_MAX_EMAIL_SUBJECT_LENGTH = 200;
export const CONTACT_LEAD_MAX_EMAIL_MESSAGE_LENGTH = 5000;
export const CONTACT_LEAD_PHONE_PATTERN = /^[0-9+()\-\s.]{6,50}$/;
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

export const contactLeadSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  email: z.string(),
  phoneNumber: z.string().nullable(),
  companyName: z.string(),
  needs: z.array(z.enum(CONTACT_NEED_CATEGORIES)),
  otherNeedDetail: z.string().nullable(),
  status: z.enum(CONTACT_LEAD_STATUSES),
  contactedAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
  contactedByUser: z
    .object({
      id: z.uuid(),
      displayName: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
});
export const contactLeadPageSchema = pageSchema(contactLeadSchema);
export const createContactLeadResponseSchema = z.object({
  id: z.uuid(),
  status: z.enum(CONTACT_LEAD_STATUSES),
  createdAt: timestamp,
});

export const createContactLeadSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "landing.demo.errors.fullNameRequired")
      .max(CONTACT_LEAD_MAX_NAME_LENGTH, "landing.demo.errors.fullNameTooLong"),
    email: z
      .string()
      .trim()
      .min(1, "landing.demo.errors.emailRequired")
      .max(CONTACT_LEAD_MAX_EMAIL_LENGTH, "landing.demo.errors.emailInvalid")
      .email("landing.demo.errors.emailInvalid"),
    phoneNumber: z
      .string()
      .trim()
      .max(CONTACT_LEAD_MAX_PHONE_LENGTH, "landing.demo.errors.phoneInvalid")
      .refine(
        (val) => val.length === 0 || CONTACT_LEAD_PHONE_PATTERN.test(val),
        "landing.demo.errors.phoneInvalid",
      )
      .optional(),
    companyName: z
      .string()
      .trim()
      .min(1, "landing.demo.errors.companyRequired")
      .max(
        CONTACT_LEAD_MAX_COMPANY_LENGTH,
        "landing.demo.errors.companyTooLong",
      ),
    needs: z
      .array(z.enum(CONTACT_NEED_CATEGORIES))
      .min(1, "landing.demo.errors.needsRequired")
      .max(CONTACT_NEED_CATEGORIES.length),
    otherNeedDetail: z
      .string()
      .trim()
      .max(
        CONTACT_LEAD_MAX_OTHER_DETAIL_LENGTH,
        "landing.demo.errors.otherDetailTooLong",
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.needs.includes("OTHER") &&
      (!data.otherNeedDetail || data.otherNeedDetail.trim().length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["otherNeedDetail"],
        message: "landing.demo.errors.otherDetailRequired",
      });
    }
  });

export const sendContactLeadEmailSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "admin.contacts.emailDialog.subjectRequired")
    .max(CONTACT_LEAD_MAX_EMAIL_SUBJECT_LENGTH),
  message: z
    .string()
    .trim()
    .min(1, "admin.contacts.emailDialog.messageRequired")
    .max(CONTACT_LEAD_MAX_EMAIL_MESSAGE_LENGTH),
});

export type ContactNeedCategory = (typeof CONTACT_NEED_CATEGORIES)[number];
export type ContactLeadStatus = (typeof CONTACT_LEAD_STATUSES)[number];

const integerParameter = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
export function adminQuerySchema(
  kind: "organizations" | "users" | "contacts",
) {
  const statusValues =
    kind === "organizations"
      ? ORGANIZATION_STATUSES
      : kind === "users"
        ? USER_STATUSES
        : CONTACT_LEAD_STATUSES;
  return z
    .object({
      q: z.string().trim().max(ADMIN_SEARCH_MAX_LENGTH).default(""),
      status: z
        .union([z.literal(""), z.enum(statusValues)])
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
