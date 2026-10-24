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
  name: z.string().min(2, "phase5.roleNameMin").max(100, "phase5.roleNameMax"),
  code: z
    .string()
    .min(2, "phase5.roleCodeMin")
    .max(50, "phase5.roleCodeMax")
    .regex(/^[A-Z0-9_]+$/, "phase5.roleCodePattern")
    .refine((value) => value !== "SUPER_ADMIN", "phase5.reservedRole"),
  description: z.string().max(255, "phase5.descriptionMax").optional(),
});
export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(2, "phase5.roleNameMin")
    .max(100, "phase5.roleNameMax")
    .optional(),
  description: z.string().max(255, "phase5.descriptionMax").optional(),
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
