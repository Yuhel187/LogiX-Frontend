import { z } from "zod";

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  phoneNumber: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const activeTenantSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable().optional(),
  role: z.string(),
});

export const tenantListItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable().optional(),
  role: z.string(),
  isDefault: z.boolean(),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
  activeTenant: activeTenantSchema.optional().nullable(),
  tenants: z.array(tenantListItemSchema).optional().default([]),
});

export const loginCredentialsSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  tenantId: z.string().optional(),
});

export const registerDataSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  displayName: z.string().optional(),
  tenantName: z.string().optional(),
  tenantCode: z.string().optional(),
  tenantId: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  token: z.string().min(1, "Mã xác thực không được để trống"),
  newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
});

export const switchTenantSchema = z.object({
  tenantId: z.string().min(1, "Mã tổ chức không được để trống"),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Tên tổ chức phải có ít nhất 2 ký tự"),
  code: z.string().optional(),
  setAsDefault: z.boolean().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2, "Tên tổ chức phải có ít nhất 2 ký tự").optional(),
  logoUrl: z.string().optional(),
});

export const organizationDetailSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable().optional(),
  status: z.string().optional(),
  settings: z.record(z.string(), z.any()).optional().default({}),
  role: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, "Tên hiển thị phải có ít nhất 2 ký tự").optional(),
  phoneNumber: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
      .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
      .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
    revokeOtherSessions: z.boolean().optional().default(true),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const userSessionSchema = z.object({
  id: z.string(),
  device: z.string(),
  browser: z.string(),
  os: z.string(),
  deviceType: z.enum(["DESKTOP", "MOBILE", "TABLET", "UNKNOWN"]).or(z.string()),
  ipAddress: z.string(),
  isCurrent: z.boolean(),
  issuedAt: z.string(),
  lastActiveAt: z.string(),
  expiresAt: z.string(),
});

export const orgMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  isDefault: z.boolean().optional(),
  joinedAt: z.string().optional(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type ActiveTenant = z.infer<typeof activeTenantSchema>;
export type TenantListItem = z.infer<typeof tenantListItemSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
export type RegisterData = z.infer<typeof registerDataSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type SwitchTenantData = z.infer<typeof switchTenantSchema>;
export type CreateOrganizationData = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationData = z.infer<typeof updateOrganizationSchema>;
export type OrganizationDetail = z.infer<typeof organizationDetailSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type UserSession = z.infer<typeof userSessionSchema>;
export type OrgMember = z.infer<typeof orgMemberSchema>;

