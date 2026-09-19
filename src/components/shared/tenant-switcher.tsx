"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  Building2,
  Users,
  ShieldCheck,
  Settings,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { OrgLogo } from "@/components/shared/org-fallback-icon";
import { CreateOrgDialog } from "@/features/identity/components/create-org-dialog";

interface TenantSwitcherProps {
  collapsed?: boolean;
  className?: string;
}

export function TenantSwitcher({
  collapsed = false,
  className,
}: TenantSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTenant, tenants, switchTenant } = useAuth();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const isAdmin =
    activeTenant?.role === "OWNER" || activeTenant?.role === "ADMIN";

  const handleSelectTenant = async (tenantId: string, tenantName: string) => {
    if (tenantId === activeTenant?.id) {
      setOpen(false);
      return;
    }

    try {
      setSwitchingId(tenantId);
      await switchTenant(tenantId);
      toast.success(t("tenant.switchSuccess", { name: tenantName }));
      setOpen(false);
      if (pathname.startsWith("/organization")) {
        router.push(`/organization/${tenantId}`);
      }
    } catch {
      toast.error(t("tenant.switchError"));
    } finally {
      setSwitchingId(null);
    }
  };

  const handleOpenSettings = () => {
    setOpen(false);
    if (activeTenant?.id) {
      router.push(`/organization/${activeTenant.id}`);
    } else {
      router.push("/settings/organization");
    }
  };

  const activeName = activeTenant?.name || "LogiX";
  const activeLogo = activeTenant?.logoUrl;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "size-10 flex items-center justify-center rounded-xl hover:bg-muted/80 transition-all cursor-pointer focus-visible:outline-hidden",
                    className
                  )}
                  aria-label={activeName}
                >
                  <OrgLogo name={activeName} logoUrl={activeLogo} size="md" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-semibold">{activeName}</p>
              <p className="text-[10px] text-muted-foreground">{t("tenant.freePlan")}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 w-full h-12 px-3 rounded-xl border border-border/70 bg-background/70 hover:bg-muted/60 hover:border-border transition-all text-left group cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring shadow-2xs",
                className
              )}
            >
              <OrgLogo name={activeName} logoUrl={activeLogo} size="md" />
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-sm font-semibold tracking-tight text-foreground truncate leading-tight">
                  {activeName}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase leading-tight mt-0.5">
                  {t("tenant.freePlan")}
                </span>
              </div>
              <ChevronDown className="size-4 text-muted-foreground/80 group-hover:text-foreground shrink-0 transition-transform duration-200" />
            </button>
          </PopoverTrigger>
        )}

        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={6}
          className="w-72 !gap-0 p-1.5 rounded-xl bg-popover/95 border border-border/70 shadow-2xl backdrop-blur-md transition-all animate-in fade-in-50 zoom-in-95"
        >
          {/* Header */}
          <div className="px-2.5 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
            {t("tenant.yourOrganizations")}
          </div>

          {/* Section 1: Tenant List */}
          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin">
            {tenants.map((tItem) => {
              const isActive = tItem.id === activeTenant?.id;
              const isSwitching = switchingId === tItem.id;

              return (
                <button
                  key={tItem.id}
                  type="button"
                  disabled={isSwitching}
                  onClick={() => handleSelectTenant(tItem.id, tItem.name)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer text-xs group",
                    isActive
                      ? "bg-accent/80 font-semibold shadow-2xs"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <OrgLogo
                    name={tItem.name}
                    logoUrl={tItem.logoUrl}
                    size="xs"
                  />
                  <span className="truncate flex-1 font-medium text-foreground text-xs">
                    {tItem.name}
                  </span>

                  {tItem.isDefault && (
                    <span className="rounded-md bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.2 text-[9px] font-bold tracking-tight shrink-0">
                      {t("tenant.defaultBadge")}
                    </span>
                  )}

                  {isActive && (
                    <span
                      title={t("tenant.activeDot")}
                      className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)] shrink-0 ml-1"
                    />
                  )}

                  {isSwitching && (
                    <Loader2 className="size-3 animate-spin text-muted-foreground shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-border/40 my-1 mx-1" />

          {/* Section 2: Organization Settings -> Navigates to dedicated page */}
          <button
            type="button"
            onClick={handleOpenSettings}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-accent/60 transition-all cursor-pointer"
          >
            <Settings className="size-3.5 text-muted-foreground" />
            <span>{t("tenant.orgSettings")}</span>
          </button>

          {/* Section 3: Admin Section (Only for OWNER/ADMIN) */}
          {isAdmin && (
            <>
              <div className="h-px bg-border/40 my-1 mx-1" />
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (activeTenant?.id) {
                      router.push(`/organization/${activeTenant.id}`);
                    }
                  }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
                >
                  <Building2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t("tenant.allOrgs")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (activeTenant?.id) {
                      router.push(`/organization/${activeTenant.id}`);
                    }
                  }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
                >
                  <Users className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t("tenant.allUsers")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (activeTenant?.id) {
                      router.push(`/organization/${activeTenant.id}`);
                    }
                  }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
                >
                  <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t("tenant.systemSecurity")}</span>
                </button>
              </div>
            </>
          )}

          <div className="h-px bg-border/40 my-1 mx-1" />

          {/* Section 4: Create Organization Dialog trigger */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setCreateOpen(true);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>{t("tenant.createNew")}</span>
          </button>
        </PopoverContent>
      </Popover>

      {/* Dialog for creating a new organization */}
      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
