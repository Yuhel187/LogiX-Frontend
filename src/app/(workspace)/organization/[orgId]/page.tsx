"use client";

import * as React from "react";
import { useState, useRef, Suspense, use, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Loader2,
  Check,
  Star,
  Users,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { OrgLogo } from "@/components/shared/org-fallback-icon";
import {
  RoleListView,
  UnifiedMembersView,
} from "@/features/identity";
import { cn } from "@/lib/utils";

interface ActiveTenantProps {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  role: string;
}

// ==========================================
// CÀI ĐẶT CHUNG (GENERAL SETTINGS)
// ==========================================
function GeneralSettingsForm({
  tenant,
  isDefaultTenant,
}: {
  tenant: ActiveTenantProps;
  isDefaultTenant: boolean;
}) {
  const { updateOrganization, setDefaultTenant, deleteOrganization, isSuperAdmin } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  // Kiểm tra quyền hạn: Tuyệt đối chỉ SUPER ADMIN hoặc OWNER mới có quyền xóa
  const isOwner = tenant.role === "OWNER";
  const canDeleteOrg = isSuperAdmin || isOwner;

  const [name, setName] = useState(tenant.name || "");
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  // State xác nhận xóa tổ chức (Type-to-Confirm)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmOrgName, setConfirmOrgName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
      await updateOrganization(tenant.id, {
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
      await setDefaultTenant(tenant.id);
      toast.success(t("tenant.setDefaultSuccess"));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("tenant.setDefaultError");
      toast.error(msg);
    } finally {
      setIsSettingDefault(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!canDeleteOrg) return;
    if (confirmOrgName.trim() !== tenant.name.trim()) return;

    try {
      setIsDeleting(true);
      const res = await deleteOrganization(tenant.id);
      toast.success(res?.message || t("tenant.deleteSuccess"));
      setIsDeleteDialogOpen(false);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("tenant.deleteError");
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Thông tin tổ chức */}
      <div className="space-y-6">
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
              className="h-10 px-4 text-sm rounded-xl bg-background border-border/80 w-full"
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
              {/* Logo Preview box */}
              <div className="size-10 rounded-xl overflow-hidden shrink-0 border border-border/80 shadow-2xs flex items-center justify-center bg-background">
                <OrgLogo name={name} logoUrl={logoUrl} size="md" className="size-full rounded-xl" />
              </div>

              {/* URL Input */}
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder={t("tenant.orgLogoPlaceholder")}
                disabled={isSaving}
                className="h-10 px-4 text-sm rounded-xl bg-background border-border/80 flex-1 min-w-0"
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
                className="h-10 px-4 rounded-xl gap-2 text-sm font-semibold shrink-0 cursor-pointer shadow-2xs hover:bg-muted/60"
              >
                <Upload className="size-4" />
                {t("tenant.uploadLogo")}
              </Button>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t("tenant.uploadLogoHint")}
            </p>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {t("tenant.instantSyncNote")}
            </span>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="h-10 px-5 rounded-xl text-sm font-semibold cursor-pointer shadow-xs min-w-32 bg-emerald-600 hover:bg-emerald-500 text-white"
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

      {/* Thiết lập tổ chức mặc định */}
      <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
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
            <div className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-sm font-semibold select-none min-w-32">
              <Check className="size-4" />
              {t("tenant.isDefaultButton")}
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleSetDefault}
              disabled={isSettingDefault}
              className="h-10 px-5 rounded-xl text-sm font-semibold cursor-pointer shadow-xs min-w-32 bg-emerald-600 hover:bg-emerald-500 text-white"
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

      {/* Xóa tổ chức */}
      <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2.5">
            <Trash2 className="size-5 text-destructive" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {t("tenant.deleteOrg")}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("tenant.deleteOrgNotice")}
          </p>
        </div>

        <div className="flex justify-end shrink-0">
          {canDeleteOrg ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmOrgName("");
                setIsDeleteDialogOpen(true);
              }}
              className="h-10 px-5 rounded-xl text-sm font-semibold cursor-pointer shadow-xs min-w-32 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <Trash2 className="mr-2 size-4" />
              {t("tenant.deleteOrg")}
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-muted/50 text-muted-foreground border border-border text-xs sm:text-sm font-medium">
              <Lock className="size-4 shrink-0 text-muted-foreground" />
              <span>{t("tenant.deleteOrgNoPermission")}</span>
            </div>
          )}
        </div>
      </div>

      {/* DIALOG XÁC NHẬN XÓA TỔ CHỨC (TYPE-TO-CONFIRM) */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader className="space-y-2">
            <div className="size-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 mb-1">
              <ShieldAlert className="size-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {t("tenant.deleteDialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {t("tenant.deleteDialogDesc", { name: tenant.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-foreground">
                {t("tenant.deleteDialogConfirmPrompt")}
              </label>
              <div className="p-2.5 rounded-xl bg-muted/50 border border-border/80 font-mono text-sm font-bold text-destructive select-all">
                {tenant.name}
              </div>
              <Input
                value={confirmOrgName}
                onChange={(e) => setConfirmOrgName(e.target.value)}
                placeholder={t("tenant.deleteDialogInputPlaceholder")}
                disabled={isDeleting}
                className="h-10 text-sm rounded-xl"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="h-10 rounded-xl cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteOrganization}
              disabled={confirmOrgName.trim() !== tenant.name.trim() || isDeleting}
              className="h-10 rounded-xl font-semibold gap-2 cursor-pointer shadow-sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("tenant.deletingOrg")}
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  {t("tenant.deleteConfirmButton")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// MAIN DETAIL PAGE CONTENT
// ==========================================
function OrganizationDetailContent({ orgId }: { orgId: string }) {
  const { activeTenant, tenants } = useAuth();
  const { t } = useTranslation();

  // Active tab: default is "members"
  const [activeTab, setActiveTab] = useState<"members" | "roles" | "general">("members");

  const currentTenant =
    tenants.find((item) => item.id === orgId) ||
    (activeTenant?.id === orgId ? activeTenant : activeTenant);

  useEffect(() => {
    if (currentTenant?.name) {
      document.title = `LogiX - ${currentTenant.name.trim()}`;
    }
  }, [currentTenant?.name]);

  const isDefaultTenant = tenants.some(
    (item) => item.id === currentTenant?.id && item.isDefault
  );

  const pageTitle = currentTenant?.name?.trim()
    ? `LogiX - ${currentTenant.name.trim()}`
    : "LogiX Platform";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 w-full">
      <title>{pageTitle}</title>

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
            {currentTenant?.name || "LogiX"}
          </p>
        </div>
      </div>

      {currentTenant ? (
        <div className="w-full rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
          {/* Top Tabs Bar: Gồm 3 tab tinh gọn (Thành viên & Lời mời, Vai trò, Cài đặt chung) */}
          <div className="flex items-center gap-2 sm:gap-6 px-6 sm:px-8 pt-4 sm:pt-6 border-b border-border/60 overflow-x-auto scrollbar-none">
            {/* Tab 1: Thành viên & Lời mời */}
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={cn(
                "flex items-center gap-2 pb-3.5 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                activeTab === "members"
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-4" />
              <span>{t("tenant.tabMembers")}</span>
            </button>

            {/* Tab 2: Phân quyền & Vai trò */}
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={cn(
                "flex items-center gap-2 pb-3.5 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                activeTab === "roles"
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck className="size-4" />
              <span>{t("iam.roles.title")}</span>
            </button>

            {/* Tab 3: Cài đặt chung */}
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={cn(
                "flex items-center gap-2 pb-3.5 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                activeTab === "general"
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="size-4" />
              <span>{t("tenant.tabGeneral")}</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 sm:p-8">
            {activeTab === "members" ? (
              <UnifiedMembersView tenantId={currentTenant.id} />
            ) : activeTab === "roles" ? (
              <RoleListView tenantId={currentTenant.id} />
            ) : (
              <GeneralSettingsForm
                key={currentTenant.id + "-" + (currentTenant.logoUrl || "") + "-" + currentTenant.name}
                tenant={currentTenant}
                isDefaultTenant={isDefaultTenant}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card p-10 text-center text-sm text-muted-foreground">
          {t("tenant.loadingTenants")}
        </div>
      )}
    </div>
  );
}

export default function OrganizationPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading...</div>}>
      <OrganizationDetailContent orgId={resolvedParams.orgId} />
    </Suspense>
  );
}
