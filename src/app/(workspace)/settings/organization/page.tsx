"use client";

import * as React from "react";
import { useState, useRef, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Loader2,
  Check,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { OrgLogo } from "@/components/shared/org-fallback-icon";

interface ActiveTenantProps {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  role: string;
}

function GeneralSettingsForm({
  activeTenant,
  isDefaultTenant,
}: {
  activeTenant: ActiveTenantProps;
  isDefaultTenant: boolean;
}) {
  const { updateOrganization, setDefaultTenant } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState(activeTenant.name || "");
  const [logoUrl, setLogoUrl] = useState(activeTenant.logoUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error(t("tenant.fileTooLargeError"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);
      toast.success(t("tenant.instantSyncNote"));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error(t("tenant.orgNameLabel"));
      return;
    }

    try {
      setIsSaving(true);
      await updateOrganization(activeTenant.id, {
        name: trimmedName,
        logoUrl: logoUrl.trim() || undefined,
      });
      toast.success(t("tenant.saveSuccess"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("tenant.saveError");
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async () => {
    if (isDefaultTenant) return;

    try {
      setIsSettingDefault(true);
      await setDefaultTenant(activeTenant.id);
      toast.success(t("tenant.setDefaultSuccess"));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("tenant.setDefaultError");
      toast.error(msg);
    } finally {
      setIsSettingDefault(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Card 1: Thông tin tổ chức */}
      <div className="w-full rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {t("tenant.tabGeneral")}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t("tenant.settingsDesc")}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6 w-full">
          {/* Tên tổ chức */}
          <div className="space-y-2 w-full">
            <label className="text-sm font-semibold text-foreground">
              {t("tenant.orgNameLabel")} <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="h-11 px-4 text-sm sm:text-base rounded-xl bg-background border-border/80 w-full"
              required
              minLength={2}
            />
          </div>

          {/* Logo tổ chức */}
          <div className="space-y-2.5 w-full">
            <label className="text-sm font-semibold text-foreground">
              {t("tenant.orgLogoLabel")}
            </label>

            <div className="flex items-center gap-3 w-full">
              {/* Logo Preview box - kích thước h-11 đồng bộ */}
              <div className="size-11 rounded-xl overflow-hidden shrink-0 border border-border/80 shadow-2xs flex items-center justify-center bg-background">
                <OrgLogo name={name} logoUrl={logoUrl} size="md" className="size-full rounded-xl" />
              </div>

              {/* URL Input */}
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder={t("tenant.orgLogoPlaceholder")}
                disabled={isSaving}
                className="h-11 px-4 text-sm sm:text-base rounded-xl bg-background border-border/80 flex-1 min-w-0"
              />

              {/* Upload Button */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
                className="h-11 px-5 rounded-xl gap-2 text-sm font-semibold shrink-0 cursor-pointer"
              >
                <Upload className="size-4" />
                {t("tenant.uploadLogo")}
              </Button>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t("tenant.uploadLogoHint")}
            </p>
          </div>

          {/* Bottom Actions - Căn phải chuẩn xác đồng bộ */}
          <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {t("tenant.instantSyncNote")}
            </span>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="h-11 px-7 rounded-xl text-sm font-semibold cursor-pointer shadow-xs min-w-36"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("tenant.saving")}
                  </>
                ) : (
                  t("tenant.saveSettings")
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Card 2: Thiết lập tổ chức mặc định */}
      <div className="w-full rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2.5">
            <Star className="size-5 text-amber-500 fill-amber-500/20" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {t("tenant.defaultSettingTitle")}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("tenant.defaultSettingDesc")}
          </p>
        </div>

        <div className="flex justify-end shrink-0">
          {isDefaultTenant ? (
            <div className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-sm font-semibold select-none min-w-36">
              <Check className="size-4" />
              {t("tenant.isDefaultButton")}
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleSetDefault}
              disabled={isSettingDefault}
              className="h-11 px-6 rounded-xl text-sm font-semibold cursor-pointer shadow-xs min-w-36"
            >
              {isSettingDefault ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("tenant.saving")}
                </>
              ) : (
                <>
                  <Star className="mr-2 size-4" />
                  {t("tenant.setDefault")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrganizationSettingsContent() {
  const router = useRouter();
  const { activeTenant, tenants } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (activeTenant?.id) {
      router.replace(`/organization/${activeTenant.id}`);
    }
  }, [activeTenant?.id, router]);

  const isDefaultTenant = tenants.some(
    (item) => item.id === activeTenant?.id && item.isDefault
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 w-full">
      {/* Header Breadcrumb */}
      <div className="flex items-center gap-3.5">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
          <Building2 className="size-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("tenant.pageTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            {activeTenant?.name || "LogiX"}
          </p>
        </div>
      </div>

      {activeTenant ? (
        <GeneralSettingsForm
          key={activeTenant.id + "-" + (activeTenant.logoUrl || "") + "-" + activeTenant.name}
          activeTenant={activeTenant}
          isDefaultTenant={isDefaultTenant}
        />
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card p-10 text-center text-sm text-muted-foreground">
          {t("tenant.loadingTenants")}
        </div>
      )}
    </div>
  );
}

export default function OrganizationSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading...</div>}>
      <OrganizationSettingsContent />
    </Suspense>
  );
}
