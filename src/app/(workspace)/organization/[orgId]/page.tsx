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
  Wrench,
  GitFork,
  ShieldCheck,
  RotateCw,
  UserPlus,
  Search,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { OrgLogo } from "@/components/shared/org-fallback-icon";
import {
  getOrganizationMembersApi,
  updateMemberRoleApi,
  removeMemberApi,
} from "@/features/identity/api/auth.api";
import type { OrgMember } from "@/features/identity/schemas/auth.schema";
import { cn } from "@/lib/utils";

interface ActiveTenantProps {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  role: string;
}

// ==========================================
// TAB 1: THÀNH VIÊN (MEMBERS)
// ==========================================
function MembersTab({ tenantId }: { tenantId: string }) {
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteDirect, setInviteDirect] = useState(false);

  const [memberToRemove, setMemberToRemove] = useState<OrgMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadMembers() {
      try {
        const data = await getOrganizationMembersApi(tenantId, accessToken || undefined);
        if (!isCancelled) {
          setMembers(data);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : "Không thể tải danh sách thành viên";
          toast.error(msg);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    if (tenantId) {
      void loadMembers();
    }

    return () => {
      isCancelled = true;
    };
  }, [tenantId, accessToken]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const data = await getOrganizationMembersApi(tenantId, accessToken || undefined);
      setMembers(data);
      toast.success(t("tenant.refresh") + " thành công");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách thành viên";
      toast.error(msg);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRoleChange = async (member: OrgMember, newRole: "OWNER" | "ADMIN" | "MEMBER") => {
    if (member.role === newRole) return;
    try {
      setUpdatingMemberId(member.id);
      await updateMemberRoleApi(tenantId, member.id, newRole, accessToken || undefined);
      toast.success(t("tenant.roleUpdateSuccess"));
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật vai trò thất bại";
      toast.error(msg);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      setIsRemoving(true);
      await removeMemberApi(tenantId, memberToRemove.id, accessToken || undefined);
      toast.success(t("tenant.removeMemberSuccess"));
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      setMemberToRemove(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Khai trừ thành viên thất bại";
      toast.error(msg);
    } finally {
      setIsRemoving(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      member.displayName.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 w-full">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {t("tenant.membersTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t("tenant.membersDesc")}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Nút Làm mới */}
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-10 px-4 rounded-xl gap-2 font-semibold text-sm cursor-pointer shadow-2xs hover:bg-muted/60"
          >
            <RotateCw className={cn("size-4", isRefreshing && "animate-spin")} />
            {t("tenant.refresh")}
          </Button>

          {/* Nút Mời thành viên */}
          <Button
            type="button"
            onClick={() => setIsInviteDialogOpen(true)}
            className="h-10 px-4 rounded-xl gap-2 font-semibold text-sm cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <UserPlus className="size-4" />
            {t("tenant.inviteMember")}
          </Button>
        </div>
      </div>

      {/* Ô tìm kiếm thành viên */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("tenant.searchMembersPlaceholder")}
          className="h-11 pl-10 pr-4 rounded-xl bg-background border-border/80 text-sm w-full"
        />
      </div>

      {/* Bảng danh sách thành viên */}
      <div className="rounded-2xl border border-border/70 overflow-hidden bg-background">
        {/* Table Header */}
        <div className="grid grid-cols-12 items-center px-6 py-3.5 bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          <div className="col-span-6 text-left">{t("tenant.colNameEmail")}</div>
          <div className="col-span-4 text-center">{t("tenant.colRole")}</div>
          <div className="col-span-2 text-right">{t("tenant.colActions")}</div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-6 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span>Đang tải danh sách thành viên...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("tenant.noMembersFound")}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredMembers.map((member) => {
              const isCurrentUser = member.userId === user?.id;
              const initials = member.displayName
                ? member.displayName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "U";

              return (
                <div
                  key={member.id}
                  className="grid grid-cols-12 items-center px-6 py-4 hover:bg-muted/15 transition-colors"
                >
                  {/* Cột 1: Tên và Email + Badge BẠN */}
                  <div className="col-span-6 flex items-center gap-3.5 min-w-0 pr-2">
                    {member.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={member.avatarUrl}
                        alt={member.displayName}
                        className="size-10 rounded-full object-cover shrink-0 border border-border/80 shadow-2xs"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/20 text-sm uppercase shadow-2xs">
                        {initials}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {member.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase shrink-0">
                            {t("tenant.youBadge")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {member.email}
                      </span>
                    </div>
                  </div>

                  {/* Cột 2: Vai trò */}
                  <div className="col-span-4 flex justify-center">
                    {member.role === "OWNER" && (
                      <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs">
                        {t("tenant.ownerRole")}
                      </span>
                    )}
                    {member.role === "ADMIN" && (
                      <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-2xs">
                        {t("tenant.adminRole")}
                      </span>
                    )}
                    {member.role === "MEMBER" && (
                      <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60">
                        {t("tenant.memberRole")}
                      </span>
                    )}
                  </div>

                  {/* Cột 3: Thao tác (...) */}
                  <div className="col-span-2 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={updatingMemberId === member.id}
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {updatingMemberId === member.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="size-5" />
                          )}
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="w-56 p-1.5 rounded-xl shadow-lg border border-border/80 bg-popover"
                      >
                        <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase px-2.5 py-1.5">
                          {t("tenant.grantRole")}
                        </DropdownMenuLabel>

                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member, "OWNER")}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-2 text-sm rounded-lg cursor-pointer",
                            member.role === "OWNER" && "font-semibold text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          <span>{t("tenant.setOwner")}</span>
                          {member.role === "OWNER" && <Check className="size-4 ml-2" />}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member, "ADMIN")}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-2 text-sm rounded-lg cursor-pointer",
                            member.role === "ADMIN" && "font-semibold text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          <span>{t("tenant.setAdmin")}</span>
                          {member.role === "ADMIN" && <Check className="size-4 ml-2" />}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member, "MEMBER")}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-2 text-sm rounded-lg cursor-pointer",
                            member.role === "MEMBER" && "font-semibold text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          <span>{t("tenant.setMember")}</span>
                          {member.role === "MEMBER" && <Check className="size-4 ml-2" />}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1 border-border/60" />

                        <DropdownMenuItem
                          disabled={isCurrentUser}
                          onClick={() => setMemberToRemove(member)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 font-medium cursor-pointer rounded-lg px-2.5 py-2 text-sm flex items-center gap-2"
                        >
                          <Trash2 className="size-4 text-destructive" />
                          <span>{t("tenant.removeMember")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hộp thoại Mời thành viên */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
              {t("tenant.inviteDialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              {t("tenant.inviteDialogDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                {t("tenant.inviteEmailLabel")}
              </label>
              <Input
                placeholder={t("tenant.inviteEmailPlaceholder")}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-11 rounded-xl bg-background border-border/80"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                {t("tenant.inviteRoleLabel")}
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-11 px-3.5 text-sm rounded-xl bg-background border border-border/80 text-foreground w-full outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="MEMBER">{t("tenant.memberRole")}</option>
                <option value="ADMIN">{t("tenant.adminRole")}</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <Checkbox
                id="directCheck"
                checked={inviteDirect}
                onCheckedChange={(checked) => setInviteDirect(!!checked)}
              />
              <label
                htmlFor="directCheck"
                className="text-xs sm:text-sm text-foreground select-none cursor-pointer"
              >
                {t("tenant.inviteDirectCheck")}
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
              className="h-10 px-5 rounded-xl text-sm font-medium cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => {
                toast.info(t("tenant.inviteFeatureComingSoon"));
                setIsInviteDialogOpen(false);
                setInviteEmail("");
              }}
              className="h-10 px-5 rounded-xl text-sm font-semibold cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {t("tenant.sendInvite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hộp thoại Xác nhận Khai trừ */}
      <Dialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <DialogContent className="sm:max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              {t("tenant.removeConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1.5 leading-relaxed">
              {memberToRemove
                ? t("tenant.removeConfirmDesc").replace(
                    "{name}",
                    memberToRemove.displayName
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMemberToRemove(null)}
              disabled={isRemoving}
              className="h-10 px-5 rounded-xl text-sm font-medium cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="h-10 px-5 rounded-xl text-sm font-semibold cursor-pointer shadow-xs"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Đang xử lý...
                </>
              ) : (
                t("tenant.removeConfirmButton")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// TAB 2: CÀI ĐẶT CHUNG (GENERAL SETTINGS)
// ==========================================
function GeneralSettingsForm({
  tenant,
  isDefaultTenant,
}: {
  tenant: ActiveTenantProps;
  isDefaultTenant: boolean;
}) {
  const { updateOrganization, setDefaultTenant } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState(tenant.name || "");
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl || "");
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
              {/* Logo Preview box */}
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

          {/* Bottom Actions */}
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

// ==========================================
// MAIN DETAIL PAGE CONTENT
// ==========================================
function OrganizationDetailContent({ orgId }: { orgId: string }) {
  const { activeTenant, tenants } = useAuth();
  const { t } = useTranslation();

  // Active tab: default is "members" as requested
  const [activeTab, setActiveTab] = useState<"members" | "general">("members");

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
          {/* Top Tabs Bar - Matching Reference Image */}
          <div className="flex items-center gap-2 sm:gap-6 px-6 sm:px-8 pt-4 sm:pt-6 border-b border-border/60 overflow-x-auto scrollbar-none">
            {/* Tab 1: Thành viên (Active default) */}
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

            {/* Tab 2: Cài đặt chung */}
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

            {/* Tab 3: App (Disabled / Placeholder) */}
            <button
              type="button"
              disabled
              className="flex items-center gap-2 pb-3.5 px-1 text-sm font-medium border-b-2 border-transparent text-muted-foreground/40 cursor-not-allowed whitespace-nowrap"
              title="Sắp ra mắt"
            >
              <Wrench className="size-4" />
              <span>{t("tenant.tabApps")}</span>
            </button>

            {/* Tab 4: Workflows (Disabled / Placeholder) */}
            <button
              type="button"
              disabled
              className="flex items-center gap-2 pb-3.5 px-1 text-sm font-medium border-b-2 border-transparent text-muted-foreground/40 cursor-not-allowed whitespace-nowrap"
              title="Sắp ra mắt"
            >
              <GitFork className="size-4" />
              <span>{t("tenant.tabWorkflows")}</span>
            </button>

            {/* Tab 5: Phân quyền (Disabled / Placeholder) */}
            <button
              type="button"
              disabled
              className="flex items-center gap-2 pb-3.5 px-1 text-sm font-medium border-b-2 border-transparent text-muted-foreground/40 cursor-not-allowed whitespace-nowrap"
              title="Sắp ra mắt"
            >
              <ShieldCheck className="size-4" />
              <span>{t("tenant.tabPermissions")}</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 sm:p-8">
            {activeTab === "members" ? (
              <MembersTab tenantId={currentTenant.id} />
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
