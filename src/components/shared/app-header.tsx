"use client";

import * as React from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  Truck,
  User,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useSidebar } from "@/components/shared/sidebar-context";
import { useTranslation } from "@/lib/i18n";

export function AppHeader() {
  const { toggleMobile } = useSidebar();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = React.useState(3);

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
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile menu toggle */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-9 rounded-lg"
          onClick={toggleMobile}
          aria-label={t("nav.collapse")}
        >
          <Menu className="size-5" />
        </Button>
      </div>

      {/* Center/Search palette */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <button
          type="button"
          onClick={() => {}}
          className="flex w-full items-center justify-between rounded-lg border border-input/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground shadow-2xs transition-colors hover:border-ring hover:bg-muted/60 focus:outline-hidden"
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

        <div className="h-4 w-px bg-border/60 mx-0.5 hidden sm:block" />

        {/* User Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 h-9 p-1 pl-1.5 pr-2.5 rounded-lg hover:bg-accent focus-visible:ring-1"
            >
              <Avatar className="size-7.5 border border-border/80">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  NA
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-xs font-semibold text-foreground leading-none">
                  Nguyễn Văn An
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {t("header.userRole")}
                </p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 shadow-lg">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold text-foreground">Nguyễn Văn An</p>
                <p className="text-[11px] text-muted-foreground">an.nguyen@logix.vn</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> {t("header.adminBadge")}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer text-xs">
                <User className="mr-2 size-4" />
                <span>{t("userMenu.profile")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-xs">
                <Settings className="mr-2 size-4" />
                <span>{t("userMenu.settings")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-xs">
                <HelpCircle className="mr-2 size-4" />
                <span>{t("userMenu.help")}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-xs text-destructive focus:text-destructive">
              <LogOut className="mr-2 size-4" />
              <span>{t("userMenu.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
