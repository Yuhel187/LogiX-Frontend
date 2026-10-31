import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DriversPage from "@/app/(workspace)/master-data/drivers/page";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { DriversScreen } from "./drivers-screen";
import { ResourcePage } from "../shared/resource-page";

const state = vi.hoisted(() => ({
  permissions: [] as string[],
  tenantId: "tenant-1" as string | null,
  token: "test-token" as string | null,
  transition: "idle",
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => {
    const hasPermission = (permission: string) =>
      state.permissions.includes(permission);
    return {
      activeTenant: state.tenantId ? { id: state.tenantId } : null,
      accessToken: state.token,
      tenantTransition: state.transition,
      hasPermission,
      hasAnyPermission: (permissions: string[]) =>
        permissions.some(hasPermission),
      hasAllPermissions: (permissions: string[]) =>
        permissions.every(hasPermission),
      isSuperAdmin: false,
      isOwner: false,
      isAdmin: false,
    };
  },
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    locale: "en",
    t: (key: string) => key,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/master-data/drivers",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../shared/resource-filters", () => ({
  ResourceFilters: () => null,
}));

vi.mock("../shared/resource-table", () => ({
  ResourceTable: ({ actions }: { actions: { label: string }[] }) =>
    actions.map((action) => action.label).join("|"),
}));

const READ = "master-data:driver:read";
const MANAGE = "master-data:driver:manage";

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

describe("Driver permission rendering", () => {
  beforeEach(() => {
    state.permissions = [];
    state.tenantId = "tenant-1";
    state.token = "test-token";
    state.transition = "idle";
  });

  it("fails closed for unknown permission context and blocks the guarded route", () => {
    const html = render(<DriversPage />);
    expect(html).not.toContain("masterData.driver.title");
    expect(html).not.toContain("masterData.driver.create");
    expect(html).not.toContain("masterData.driver.relink.action");

    const guarded = render(
      <PermissionGuard permission={READ}>
        <span>protected-driver-content</span>
      </PermissionGuard>
    );
    expect(guarded).toBe("");
  });

  it("allows Driver read permission but hides management controls without manage", () => {
    state.permissions = [READ];

    const html = render(<DriversPage />);
    expect(html).toContain("masterData.driver.title");
    expect(html).not.toContain("masterData.driver.create</button>");
    expect(html).not.toContain("common.edit");
    expect(html).not.toContain("masterData.disable");
    expect(html).not.toContain("masterData.enable");
    expect(html).not.toContain("masterData.driver.relink.action");
  });

  it("does not let manage-only permission bypass the route read guard", () => {
    state.permissions = [MANAGE];

    const html = render(<DriversPage />);
    expect(html).not.toContain("masterData.driver.title");
    expect(html).not.toContain("masterData.driver.create");
  });

  it("shows create/edit/enable-disable controls only with manage permission", () => {
    state.permissions = [READ, MANAGE];

    const html = render(<DriversPage />);
    expect(html).toContain("masterData.driver.create</button>");
    expect(html).toContain("common.edit");
    expect(html).toContain("masterData.disable");
    expect(html).toContain("masterData.enable");
    expect(html).toContain("masterData.driver.relink.action");
  });

  it("keeps ResourcePage create visible by default and honors its explicit opt-out", () => {
    const props = {
      title: "Resource title",
      description: "Resource description",
      searchPlaceholder: "Search",
      emptyMessage: "Empty",
      createLabel: "Create resource",
      columns: [],
      fetchPage: async () => ({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
      }),
      buildActions: () => [],
      onCreate: vi.fn(),
    };

    expect(render(<ResourcePage {...props} />)).toContain(
      "Create resource</button>"
    );
    expect(
      render(<ResourcePage {...props} canCreate={false} />)
    ).not.toContain("Create resource</button>");
  });

  it("keeps the general PermissionGuard fallback behavior for denied and allowed access", () => {
    const content = (
      <PermissionGuard permission={READ} fallback={<span>denied</span>}>
        <span>allowed</span>
      </PermissionGuard>
    );
    expect(render(content)).toBe("<span>denied</span>");
    state.permissions = [READ];
    expect(render(content)).toBe("<span>allowed</span>");
  });

  it("shows manager controls on the Driver screen when manage is present", () => {
    state.permissions = [MANAGE];
    const html = render(<DriversScreen />);
    expect(html).toContain("masterData.driver.create</button>");
    expect(html).toContain("common.edit");
    expect(html).toContain("masterData.disable");
    expect(html).toContain("masterData.enable");
    expect(html).toContain("masterData.driver.relink.action");
  });

  it.each(["tenant", "session", "transition"])(
    "hides relink when %s context is unknown or changing",
    (missing) => {
      state.permissions = [READ, MANAGE];
      if (missing === "tenant") state.tenantId = null;
      if (missing === "session") state.token = null;
      if (missing === "transition") state.transition = "switching";
      expect(render(<DriversScreen />)).not.toContain("masterData.driver.relink.action");
    }
  );
});
