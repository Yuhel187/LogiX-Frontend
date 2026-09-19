"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * Dynamically synchronizes browser tab title and favicon with active organization:
 * Tab title format: `LogiX - ${orgName}`
 * Favicon: active organization's logo or fallback icon.
 */
export function DynamicTenantHead() {
  const { activeTenant, tenants } = useAuth();
  const pathname = usePathname();

  // 1. Tên từ activeTenant
  let orgName = activeTenant?.name?.trim();

  // 2. Nếu đang ở trang /organization/[orgId], lấy tên từ tenants tương ứng với orgId
  if (!orgName && pathname.startsWith("/organization/")) {
    const orgIdFromPath = pathname.split("/organization/")[1]?.split("/")[0]?.split("?")[0];
    if (orgIdFromPath) {
      const found = tenants.find((t) => t.id === orgIdFromPath);
      if (found?.name) {
        orgName = found.name.trim();
      }
    }
  }

  // 3. Fallback lấy tên tổ chức đầu tiên trong danh sách
  if (!orgName && tenants.length > 0) {
    orgName = tenants[0]?.name?.trim();
  }

  const targetTitle = orgName ? `LogiX Platform - ${orgName}` : "LogiX Platform";

  useEffect(() => {
    document.title = targetTitle;

    // Đồng bộ favicon của tổ chức
    const logoUrl =
      activeTenant?.logoUrl?.trim() ||
      (pathname.startsWith("/organization/")
        ? tenants.find(
          (t) =>
            t.id ===
            pathname.split("/organization/")[1]?.split("/")[0]?.split("?")[0]
        )?.logoUrl || undefined
        : undefined);

    const faviconTarget = logoUrl || "/fav_logo_logix.png";

    // Cập nhật hoặc khởi tạo icon link elements
    const iconSelectors = ["link[rel*='icon']", "link[rel='apple-touch-icon']"];
    iconSelectors.forEach((selector) => {
      const existing = document.querySelectorAll(selector);
      if (existing.length > 0) {
        existing.forEach((el) => {
          (el as HTMLLinkElement).href = faviconTarget;
        });
      } else {
        const link = document.createElement("link");
        link.rel = "shortcut icon";
        link.href = faviconTarget;
        document.head.appendChild(link);
      }
    });
  }, [targetTitle, activeTenant?.logoUrl, tenants, pathname]);

  return (
    <>
      <title>{targetTitle}</title>
    </>
  );
}
