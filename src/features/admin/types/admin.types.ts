import type { z } from "zod";
import type {
  adminQuerySchema,
  CONTACT_LEAD_STATUSES,
  CONTACT_NEED_CATEGORIES,
  contactLeadPageSchema,
  contactLeadSchema,
  createContactLeadSchema,
  organizationPageSchema,
  userPageSchema,
} from "../schemas/admin.schema";

export type AdminListKind = "organizations" | "users" | "contacts";
export type AdminQuery = z.infer<ReturnType<typeof adminQuerySchema>>;
export type OrganizationPage = z.infer<typeof organizationPageSchema>;
export type UserPage = z.infer<typeof userPageSchema>;
export type ContactLead = z.infer<typeof contactLeadSchema>;
export type ContactLeadItem = ContactLead;
export type ContactLeadPage = z.infer<typeof contactLeadPageSchema>;
export type ContactNeedCategory = (typeof CONTACT_NEED_CATEGORIES)[number];
export type ContactLeadStatus = (typeof CONTACT_LEAD_STATUSES)[number];
export type CreateContactLeadInput = z.infer<typeof createContactLeadSchema>;
export type AdminPage = OrganizationPage | UserPage;
