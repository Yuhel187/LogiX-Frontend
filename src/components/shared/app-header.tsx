"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  LogOut,
  Menu,
  Package,
  PanelLeft,
  Search,
  Settings,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { useSidebar } from "@/components/shared/sidebar-context";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function AppHeader() {
  const pathname = usePathname();
  const { toggleMobile, isCollapsed, toggleCollapse } = useSidebar();
  const { t } = useTranslation();
  const { user, activeTenant, logout } = useAuth();
  const [unreadCount, setUnreadCount] = React.useState(3);

  const getPageTitle = () => {
    if (pathname === "/") return t("nav.overview");
    if (
      pathname.startsWith("/organization") ||
      pathname.startsWith("/settings/organization")
    )
      return t("tenant.pageTitle");
    if (pathname.startsWith("/settings/account")) return t("account.pageTitle");
    return "";
  };
  const pageTitle = getPageTitle();

  const notifications = [
    {
      id: "1",
      title: "Chuyến xe #TRIP-1082 đã xuất bến",
      desc: "Tài xế Trần Quốc Hưng đang di chuyển đến Kho Đà Nẵng",
      time: "5 phút trước",
      icon: Truck,
      color: "text-emerald-500",
    },
    {
      id: "2",
      title: "Cảnh báo tồn kho SKU-BOX-10",
      desc: "Kho Tổng Hà Nội chỉ còn dưới 15 kiện",
      time: "25 phút trước",
      icon: Package,
      color: "text-amber-500",
    },
    {
      id: "3",
      title: "Đơn hàng #DH-9942 cần phê duyệt",
      desc: "Đơn hàng giá trị lớn chờ xác nhận tuyến đường",
      time: "1 giờ trước",
      icon: Clock,
      color: "text-blue-500",
    },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-18 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Sidebar toggle + Current Section Title */}
      <div className="flex items-center gap-3 sm:gap-3.5">
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
          <span className="text-lg font-bold text-foreground tracking-tight select-none">
            {pageTitle}
          </span>
        )}
      </div>

      {/* Center/Search palette */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <button
          type="button"
          onClick={() => {}}
          className="flex w-full items-center justify-between rounded-xl border border-input/80 bg-muted/30 px-3.5 py-2.5 text-sm text-muted-foreground shadow-2xs transition-colors hover:border-ring hover:bg-muted/60 focus:outline-hidden"
        >
          <span className="flex items-center gap-2.5">
            <Search className="size-4 text-muted-foreground" />
            <span>{t("header.searchPlaceholder")}</span>
          </span>
          <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex border border-border/60">
            <span>⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right Actions: Language, Notifications, ThemeToggle, User Avatar */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Language Switcher */}
        <LanguageToggle />

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={t("header.notifications")}
              title={t("header.notifications")}
            >
              <div className="relative flex items-center justify-center">
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-xs ring-2 ring-background animate-in zoom-in-50">
                    {unreadCount}
                  </span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  {t("header.notifications")}
                </span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                  {t("header.newBadge", { count: unreadCount })}
                </span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => setUnreadCount(0)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("header.markAllAsRead")}
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
              {notifications.map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                  >
                    <div className={cn("mt-0.5 rounded-md p-1.5 bg-muted", n.color)}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground leading-snug">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {n.desc}
                      </p>
                      <span className="text-[10px] text-muted-foreground/80 font-medium">
                        {n.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border/60 p-2 text-center">
              <span className="text-xs font-medium text-primary hover:underline cursor-pointer">
                {t("header.viewAllHistory")}
              </span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block" />

        {/* User Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 h-11 px-3 rounded-xl border border-border/70 bg-background/70 hover:bg-accent/80 transition-all cursor-pointer focus-visible:ring-1"
            >
              <Avatar className="size-8.5 border border-border/80 rounded-xl overflow-hidden">
                <AvatarImage src={user?.avatarUrl || ""} alt={user?.displayName || "Avatar"} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "LX"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                  {user?.displayName || "LogiX User"}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">
                  {activeTenant?.role || t("header.userRole")}
                </p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2 rounded-2xl shadow-2xl border border-border/70 bg-popover/95 backdrop-blur-md">
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
                    <CheckCircle2 className="size-3.5" /> {activeTenant?.name || t("header.adminBadge")}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem asChild className="cursor-pointer px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors gap-3">
                <Link href="/settings/account" className="flex items-center gap-3 w-full">
                  <Settings className="size-4.5 text-muted-foreground" />
                  <span>{t("userMenu.settings")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors gap-3">
                <HelpCircle className="size-4.5 text-muted-foreground" />
                <span>{t("userMenu.help")}</span>
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
