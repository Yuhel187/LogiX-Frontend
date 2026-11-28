import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import viLocales from "@/locales/vi.json";
import enLocales from "@/locales/en.json";
import libViLocales from "@/lib/i18n/locales/vi.json";
import libEnLocales from "@/lib/i18n/locales/en.json";
import {
  IAM_PERMISSIONS,
  MAX_TENANT_AI_INSTRUCTIONS_LENGTH,
  tenantAiInstructionsViewSchema,
  updateTenantAiInstructionsSchema,
} from "../../schemas/auth.schema";
import {
  TenantAiInstructionsForm,
  canManageTenantAiInstructions,
} from "./tenant-ai-instructions-form";

const mockAuthState = vi.hoisted(() => ({
  accessToken: "test-token",
  isSuperAdmin: false,
  isOwner: false,
  permissions: [] as string[],
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    accessToken: mockAuthState.accessToken,
    isSuperAdmin: mockAuthState.isSuperAdmin,
    isOwner: mockAuthState.isOwner,
    hasPermission: (perm: string) =>
      mockAuthState.permissions.includes("*") ||
      mockAuthState.permissions.includes(perm),
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: "vi",
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TenantAiInstructionsForm, dynamic RBAC & i18n parity", () => {
  beforeEach(() => {
    mockAuthState.isSuperAdmin = false;
    mockAuthState.isOwner = false;
    mockAuthState.permissions = [];
  });

  it("validates AI instructions view and update schemas", () => {
    expect(
      updateTenantAiInstructionsSchema.safeParse({
        customInstructions: "a".repeat(MAX_TENANT_AI_INSTRUCTIONS_LENGTH),
        enabled: true,
      }).success,
    ).toBe(true);

    expect(
      updateTenantAiInstructionsSchema.safeParse({
        customInstructions: "a".repeat(MAX_TENANT_AI_INSTRUCTIONS_LENGTH + 1),
      }).success,
    ).toBe(false);

    expect(
      tenantAiInstructionsViewSchema.safeParse({
        tenantId: "t1",
        customInstructions: null,
        enabled: true,
        isDefault: true,
        maxLength: 2000,
        version: 1,
        updatedAt: null,
        updatedBy: null,
      }).success,
    ).toBe(true);
  });

  it("evaluates dynamic multi-tenant RBAC permission correctly", () => {
    const denyAll = () => false;
    const withManage = (p: string) =>
      p === IAM_PERMISSIONS.AI_INSTRUCTIONS_MANAGE;

    expect(
      canManageTenantAiInstructions({
        isSuperAdmin: false,
        isOwner: false,
        hasPermission: denyAll,
      }),
    ).toBe(false);

    expect(
      canManageTenantAiInstructions({
        isSuperAdmin: false,
        isOwner: false,
        hasPermission: withManage,
      }),
    ).toBe(true);

    expect(
      canManageTenantAiInstructions({
        isSuperAdmin: false,
        isOwner: true,
        hasPermission: denyAll,
      }),
    ).toBe(true);

    expect(
      canManageTenantAiInstructions({
        isSuperAdmin: true,
        isOwner: false,
        hasPermission: denyAll,
      }),
    ).toBe(true);
  });

  it("keeps all 4 VI/EN locale files in parity for tenant.aiInstructions* and iam matrix keys", () => {
    const viTenantKeys = Object.keys(viLocales.tenant).filter((k) =>
      k.startsWith("aiInstructions"),
    );
    const enTenantKeys = Object.keys(enLocales.tenant).filter((k) =>
      k.startsWith("aiInstructions"),
    );
    expect(viTenantKeys.length).toBeGreaterThanOrEqual(20);
    expect(viTenantKeys).toEqual(enTenantKeys);
    expect(libViLocales.tenant).toEqual(viLocales.tenant);
    expect(libEnLocales.tenant).toEqual(enLocales.tenant);

    expect(Object.keys(viLocales.iam.modules)).toEqual(
      Object.keys(enLocales.iam.modules),
    );
    expect(viLocales.iam.modules).toHaveProperty("FULFILLMENT");
    expect(viLocales.iam.modules).toHaveProperty("MASTER_DATA");
    expect(viLocales.iam.modules).toHaveProperty("FORECAST");

    expect(Object.keys(viLocales.iam.resources)).toEqual(
      Object.keys(enLocales.iam.resources),
    );
    expect(viLocales.iam.resources).toHaveProperty("ai_instructions");
    expect(viLocales.iam.resources).toHaveProperty("organization");
    expect(viLocales.iam.resources).toHaveProperty("demand_forecast");

    expect(Object.keys(viLocales.iam.matrix.actions)).toEqual(
      Object.keys(enLocales.iam.matrix.actions),
    );
    expect(viLocales.iam.matrix.actions).toHaveProperty("approve");
    expect(viLocales.iam.matrix.actions).toHaveProperty("complete");
  });

  it("renders initial loading state cleanly without throwing", () => {
    const html = renderToStaticMarkup(
      <TenantAiInstructionsForm tenantId="t1" />,
    );
    expect(html).toContain("tenant.aiInstructionsTitle");
    expect(html).toContain("tenant.aiInstructionsLoading");
  });
});
