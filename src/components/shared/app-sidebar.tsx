"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSidebar } from "@/components/shared/sidebar-context";
import { useTranslation } from "@/lib/i18n";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "warning" | "info";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile, setIsMobileOpen } =
    useSidebar();
  const { t } = useTranslation();

  const navGroups: NavGroup[] = [
    {
      label: t("nav.systemManagement"),
      items: [
        {
          title: t("nav.overview"),
          href: "/",
          icon: LayoutDashboard,
        },
        {
          title: t("nav.generalConfig"),
          href: "#config",
          icon: Settings,
        },
      ],
    },
    {
      label: t("nav.feature1"),
      items: [
        {
          title: t("nav.moduleA"),
          href: "#module-a",
          icon: Boxes,
        },
        {
          title: t("nav.moduleB"),
          href: "#module-b",
          icon: BarChart3,
        },
      ],
    },
  ];

  const renderNavLinks = (collapsed: boolean) => (
    <div className="flex flex-col flex-1 py-4 overflow-y-auto overflow-x-hidden gap-3 px-3">
      {navGroups.map((group, groupIdx) => (
        <div key={group.label || groupIdx} className="w-full space-y-1">
          {/* Subtle divider for collapsed mode when there are multiple groups */}
          {groupIdx > 0 && (
            <div
              className={cn(
                "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden mx-auto",
                collapsed
                  ? "w-8 h-px bg-border/60 my-2 opacity-100"
                  : "w-0 h-0 opacity-0 my-0 pointer-events-none"
              )}
            />
          )}

          {/* Group Header Label */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center px-2",
              collapsed
                ? "max-h-0 opacity-0 mb-0 pointer-events-none"
                : "max-h-6 opacity-100 mb-1.5"
            )}
          >
            <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase truncate whitespace-nowrap">
              {group.label}
            </h2>
          </div>

          {/* Nav Items List */}
          <nav className="space-y-1 w-full">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Tooltip key={item.href} open={collapsed ? undefined : false}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      onClick={closeMobile}
                      className={cn(
                        "group flex items-center h-10 w-full rounded-lg transition-colors duration-150 relative overflow-hidden",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {/* Fixed 40x40 (size-10) icon container - NEVER shifts horizontally */}
                      <div className="size-10 shrink-0 flex items-center justify-center">
                        <Icon
                          className={cn(
                            "size-5 transition-transform duration-200 group-hover:scale-105",
                            isActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                      </div>

                      {/* Label & Badge: smooth slide & fade without causing layout shift */}
                      <div
                        className={cn(
                          "flex items-center min-w-0 flex-1 pr-2 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden whitespace-nowrap",
                          collapsed
                            ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                            : "opacity-100 max-w-[200px] translate-x-0"
                        )}
                      >
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>

                        {item.badge && (
                          <span
                            className={cn(
                              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight whitespace-nowrap shrink-0",
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : item.badgeVariant === "warning"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col shrink-0 border-r border-border/80 bg-sidebar relative z-30 overflow-visible select-none",
          "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width]",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Floating Border Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="absolute -right-3 top-5 z-50 flex size-6 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground shadow-md hover:text-foreground hover:bg-accent focus-visible:outline-hidden transition-colors cursor-pointer"
          title={isCollapsed ? t("nav.expand") : t("nav.collapse")}
          aria-label={isCollapsed ? t("nav.expand") : t("nav.collapse")}
        >
          <ChevronLeft
            className={cn(
              "size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isCollapsed && "rotate-180"
            )}
          />
        </button>

        {/* Brand Header */}
        <div className="flex h-16 items-center border-b border-border/70 px-3 relative overflow-hidden">
          <Link
            href="/"
            className="flex items-center min-w-0 overflow-hidden w-full"
          >
            {/* Fixed size-10 icon container to align with nav icons below */}
            <div className="size-10 shrink-0 flex items-center justify-center">
              <div className="flex size-9 items-center justify-center rounded-xl overflow-hidden shadow-xs border border-border/50 bg-background">
                <Image
                  src="/fav_logo_logix.png"
                  alt="LogiX Logo"
                  width={36}
                  height={36}
                  className="size-full object-contain p-0.5"
                />
              </div>
            </div>
            <div
              className={cn(
                "flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap overflow-hidden ml-2",
                isCollapsed
                  ? "opacity-0 max-w-0 pointer-events-none -translate-x-2"
                  : "opacity-100 max-w-[150px] translate-x-0"
              )}
            >
              <span className="text-base font-bold tracking-tight text-sidebar-foreground truncate">
                Logi<span className="text-primary">X</span>
              </span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase truncate">
                {t("nav.brandSubtitle")}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation links */}
        {renderNavLinks(isCollapsed)}
      </aside>

      {/* Mobile Drawer (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col bg-sidebar">
          <SheetTitle className="sr-only">Menu điều hướng LogiX</SheetTitle>
          <div className="flex h-16 items-center border-b border-border/70 px-4">
            <div className="size-10 shrink-0 flex items-center justify-center">
              <div className="flex size-9 items-center justify-center rounded-xl overflow-hidden shadow-xs border border-border/50 bg-background">
                <Image
                  src="/fav_logo_logix.png"
                  alt="LogiX Logo"
                  width={36}
                  height={36}
                  className="size-full object-contain p-0.5"
                />
              </div>
            </div>
            <div className="flex flex-col min-w-0 ml-2">
              <span className="text-base font-bold tracking-tight text-sidebar-foreground truncate">
                Logi<span className="text-primary">X</span>
              </span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase truncate">
                {t("nav.brandSubtitle")}
              </span>
            </div>
          </div>

          {renderNavLinks(false)}
        </SheetContent>
      </Sheet>
    </>
  );
}
