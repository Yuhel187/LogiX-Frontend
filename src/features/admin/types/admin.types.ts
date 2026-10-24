import type { z } from "zod";
import type {
  adminQuerySchema,
  organizationPageSchema,
  userPageSchema,
} from "../schemas/admin.schema";

export type AdminListKind = "organizations" | "users";
export type AdminQuery = z.infer<ReturnType<typeof adminQuerySchema>>;
export type OrganizationPage = z.infer<typeof organizationPageSchema>;
export type UserPage = z.infer<typeof userPageSchema>;
export type AdminPage = OrganizationPage | UserPage;
