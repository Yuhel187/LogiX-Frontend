"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeft,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { GlobalSearchPalette } from "@/components/shared/global-search-palette";
import { useSidebar } from "@/components/shared/sidebar-context";
import { NotificationBell } from "@/features/notifications";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { WORKSPACE_HOME_ROUTE } from "@/lib/config/routes";

export function AppHeader() {
  const pathname = usePathname();
  const { toggleMobile, isCollapsed, toggleCollapse } = useSidebar();
  const { t } = useTranslation();
  const { user, activeTenant, logout, isSuperAdmin } = useAuth();

  const getPageTitle = () => {
    if (pathname === WORKSPACE_HOME_ROUTE) return t("nav.overview");
    if (pathname.startsWith("/admin/organizations"))
      return t("admin.organizations.title");
    if (pathname.startsWith("/admin/users")) return t("admin.users.title");
    if (
      pathname.startsWith("/organization") ||
      pathname.startsWith("/settings/organization")
    )
      return t("tenant.pageTitle");
    if (pathname.startsWith("/settings/account")) return t("account.pageTitle");
    if (pathname.startsWith("/forecast")) return t("forecast.title");
    return "";
  };
  const pageTitle = getPageTitle();

  return (
    <header className="app-header sticky top-0 z-20 flex h-18 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Sidebar toggle + Current Section Title */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-3.5">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-10 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={toggleMobile}
          aria-label={t("nav.collapse")}
        >
          <Menu className="size-5" />
        </Button>

        {/* Desktop sidebar toggle button matching reference */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex size-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? t("nav.expand") : t("nav.collapse")}
          title={isCollapsed ? t("nav.expand") : t("nav.collapse")}
        >
          <PanelLeft className="size-5" />
        </Button>

        {/* Page Title next to toggle button */}
        {pageTitle && (
          <span className="whitespace-nowrap text-lg font-bold text-foreground tracking-tight select-none">
            {pageTitle}
          </span>
        )}
      </div>

      {/* Center/Search palette */}
      <GlobalSearchPalette />

      {/* Right Actions: Language, Notifications, ThemeToggle, User Avatar */}
      <div className="app-header-actions flex shrink-0 items-center gap-2 sm:gap-2.5">
        {/* Language Switcher */}
        <LanguageToggle />

        {/* Notifications Dropdown */}
        <NotificationBell />

        {/* LogiX AI Copilot Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("logix:open-copilot"));
            }
          }}
          className="relative size-9 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 cursor-pointer"
          aria-label={t("chat.openCopilot") || "LogiX Copilot"}
          title={t("chat.openCopilot") || "LogiX Copilot"}
        >
          <Sparkles className="size-4.5" />
        </Button>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block" />

        {/* User Profile Menu */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 h-11 px-3 rounded-xl border border-border/70 bg-background/70 hover:bg-accent/80 transition-all cursor-pointer focus-visible:ring-1"
            >
              <Avatar className="size-8.5 border border-border/80 rounded-xl overflow-hidden">
                <AvatarImage
                  src={user?.avatarUrl || ""}
                  alt={user?.displayName || "Avatar"}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {user?.displayName
                    ? user.displayName.slice(0, 2).toUpperCase()
                    : "LX"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                  {user?.displayName || "LogiX User"}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">
                  {isSuperAdmin
                    ? t("admin.account.superAdmin")
                    : activeTenant?.role || t("header.userRole")}
                </p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 p-2 rounded-2xl shadow-2xl border border-border/70 bg-popover/95 backdrop-blur-md"
          >
            <DropdownMenuLabel className="p-2 pb-2.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-foreground">
                  {user?.displayName || "LogiX User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || "user@logix.vn"}
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="size-3.5" />{" "}
                    {activeTenant?.name || t("header.adminBadge")}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem
                asChild
                className="cursor-pointer px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors gap-3"
              >
                <Link
                  href="/settings/account"
                  className="flex items-center gap-3 w-full"
                >
                  <Settings className="size-4.5 text-muted-foreground" />
                  <span>{t("userMenu.settings")}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer px-3 py-2.5 rounded-xl text-sm font-semibold text-destructive focus:text-destructive hover:bg-destructive/10 transition-colors gap-3"
            >
              <LogOut className="size-4.5" />
              <span>{t("userMenu.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
