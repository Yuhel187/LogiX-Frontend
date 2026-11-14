"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PUBLIC_LANDING_ROUTE } from "@/lib/config/routes";

/**
 * Dynamically synchronizes browser tab title and favicon with active organization:
 * Tab title format: `LogiX Platform - ${orgName}`
 * Favicon: active organization's logo or fallback icon.
 */
export function DynamicTenantHead() {
  const pathname = usePathname();
  const { activeTenant } = useAuth();
  const orgName = activeTenant?.name?.trim();
  const isLandingRoute = pathname === PUBLIC_LANDING_ROUTE;

  const targetTitle = orgName
    ? `LogiX Platform - ${orgName}`
    : "LogiX Platform";

  useEffect(() => {
    if (!isLandingRoute) {
      document.title = targetTitle;
    }

    // Đồng bộ favicon của tổ chức
    const logoUrl = activeTenant?.logoUrl?.trim();

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
  }, [isLandingRoute, targetTitle, activeTenant?.logoUrl]);

  if (isLandingRoute) {
    return null;
  }

  return (
    <>
      <title>{targetTitle}</title>
    </>
  );
}
