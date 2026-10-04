import { z } from "zod";

export const permissionItemSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string().optional(),
  module: z.string(),
  resource: z.string(),
  action: z.string(),
  description: z.string().nullable().optional(),
});
export type PermissionItem = z.infer<typeof permissionItemSchema>;

export const roleItemSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isSystem: z.boolean(),
  memberCount: z.number().default(0),
  permissionCount: z.number().default(0),
  permissionIds: z.array(z.string().uuid()).default([]),
  permissions: z.array(permissionItemSchema).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type RoleItem = z.infer<typeof roleItemSchema>;

export const createRoleSchema = z.object({
  name: z.string().min(2, "Tên vai trò phải có ít nhất 2 ký tự").max(100),
  code: z
    .string()
    .min(2, "Mã vai trò phải có ít nhất 2 ký tự")
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "Mã vai trò chỉ chứa chữ in hoa, số và dấu gạch dưới"),
  description: z.string().max(255).optional(),
});
export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().min(2, "Tên vai trò phải có ít nhất 2 ký tự").max(100).optional(),
  description: z.string().max(255).optional(),
});
export type UpdateRoleFormValues = z.infer<typeof updateRoleSchema>;

export interface MemberWithRolesItem {
  id: string;
  userId?: string;
  email: string;
  displayName: string;
  role?: string;
  roles?: RoleItem[];
  joinedAt?: string;
}
