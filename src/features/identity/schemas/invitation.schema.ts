import { z } from "zod";

// Schema form gửi lời mời mới kèm danh sách vai trò
export const createInvitationSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
  roleIds: z.array(z.string().uuid("ID vai trò không hợp lệ")).min(1, "Vui lòng chọn ít nhất một vai trò"),
});
export type CreateInvitationFormValues = z.infer<typeof createInvitationSchema>;

// Schema chi tiết lời mời hiển thị trên bảng quản lý
export const invitationItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  roleIds: z.array(z.string().uuid()),
  roles: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string(),
    })
  ),
  inviter: z.object({
    id: z.string().uuid(),
    displayName: z.string().nullable(),
    email: z.string(),
  }),
  status: z.enum(["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]),
  expiresAt: z.string(),
  createdAt: z.string(),
  acceptedAt: z.string().nullable().optional(),
});
export type InvitationItem = z.infer<typeof invitationItemSchema>;

// Schema thông tin preview công khai khi mở liên kết mời
export const invitationPreviewSchema = z.object({
  id: z.string().uuid().optional(),
  valid: z.boolean().optional().default(true),
  email: z.string().email(),
  tenant: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    logoUrl: z.string().nullable().optional(),
  }),
  inviter: z.object({
    id: z.string().uuid().optional(),
    displayName: z.string().nullable(),
    email: z.string(),
  }),
  roles: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string(),
      description: z.string().nullable().optional(),
      isSystem: z.boolean().optional(),
    })
  ),
  expiresAt: z.union([z.string(), z.date()]),
  userExists: z.boolean().optional(),
  requiresRegistration: z.boolean().optional(),
});
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>;

// Schema form chấp nhận lời mời (cho tài khoản mới)
export const acceptInvitationSchema = z.object({
  displayName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100).optional(),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").optional(),
});
export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;
