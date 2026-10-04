"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Shield,
  ShieldAlert,
  Loader2,
  Check,
  Info,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getRolesApi, assignMemberRolesApi, getMembersApi } from "../../api/roles.api";
import type { RoleItem } from "../../schemas/role.schema";
import type { OrgMember } from "../../schemas/auth.schema";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ManageMemberRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrgMember | null;
  tenantId: string;
  onSuccess: () => void;
}

export function ManageMemberRolesDialog({
  open,
  onOpenChange,
  member,
  tenantId,
  onSuccess,
}: ManageMemberRolesDialogProps) {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = member?.role === "OWNER";

  useEffect(() => {
    if (!open || !member) return;

    let isMounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const [allRoles, membersWithRoles] = await Promise.all([
          getRolesApi(tenantId).catch(() => [] as RoleItem[]),
          getMembersApi(tenantId).catch(() => [] as any[]),
        ]);

        if (!isMounted) return;

        // Bỏ role SUPER_ADMIN và OWNER khỏi danh sách vai trò có thể gán thông thường
        const assignableRoles = allRoles.filter(
          (r) => r.code !== "SUPER_ADMIN" && r.code !== "OWNER"
        );
        setRoles(assignableRoles);

        // Tìm vai trò hiện tại của thành viên
        const currentMemberData = membersWithRoles.find(
          (m: any) => m.userId === member.userId || m.id === member.id
        );

        if (currentMemberData && Array.isArray(currentMemberData.roles) && currentMemberData.roles.length > 0) {
          const currentRoleIds = currentMemberData.roles
            .map((r: any) => r.id)
            .filter((id: string) => assignableRoles.some((ar) => ar.id === id));
          setSelectedRoleIds(currentRoleIds);
        } else {
          // Fallback: Tìm role khớp với member.role code
          const matchedRole = assignableRoles.find((r) => r.code === member.role);
          if (matchedRole) {
            setSelectedRoleIds([matchedRole.id]);
          } else {
            // Mặc định chọn role MEMBER nếu có
            const defaultMemberRole = assignableRoles.find((r) => r.code === "MEMBER");
            setSelectedRoleIds(defaultMemberRole ? [defaultMemberRole.id] : []);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t("tenant.loadRolesError");
        toast.error(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, member, tenantId, t]);

  const handleToggleRole = (roleId: string) => {
    if (isOwner) return;

    setSelectedRoleIds((prev) => {
      if (prev.includes(roleId)) {
        // Cần giữ lại ít nhất 1 role
        if (prev.length <= 1) {
          toast.warning(t("tenant.minOneRoleRequired"));
          return prev;
        }
        return prev.filter((id) => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const handleSave = async () => {
    if (!member) return;

    if (isOwner) {
      toast.error(t("tenant.ownerProtectionNotice"));
      return;
    }

    if (selectedRoleIds.length === 0) {
      toast.error(t("tenant.minOneRoleRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await assignMemberRolesApi(member.userId, selectedRoleIds, tenantId);
      toast.success(t("tenant.updateRolesSuccess", { name: member.displayName }));
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("tenant.updateRolesError");
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Shield className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {t("tenant.manageMemberRolesTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t("tenant.manageMemberRolesDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Member Info Card */}
        {member && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/70 mt-2">
            {member.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={member.avatarUrl}
                alt={member.displayName}
                className="size-10 rounded-full object-cover shrink-0 border border-border/80"
              />
            ) : (
              <div className="size-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/20 text-sm uppercase">
                {member.displayName ? member.displayName.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground truncate">
                  {member.displayName}
                </span>
                {isOwner && (
                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-semibold">
                    {t("tenant.ownerRole")}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono truncate block">
                {member.email}
              </span>
            </div>
          </div>
        )}

        {/* Warning if Target Member is OWNER */}
        {isOwner ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs leading-relaxed flex items-start gap-3 mt-1">
            <ShieldAlert className="size-5 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <strong className="font-semibold block mb-0.5">{t("tenant.ownerCannotBeEditedTitle")}</strong>
              {t("tenant.ownerCannotBeEditedDesc")}
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("tenant.orgRolesList")}
              </label>
              <span className="text-[11px] text-muted-foreground">
                {t("tenant.selectedCount", { count: selectedRoleIds.length })}
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="size-5 animate-spin text-emerald-600" />
                <span>{t("tenant.loadingOrgRoles")}</span>
              </div>
            ) : roles.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border/80">
                {t("tenant.noAvailableRoles")}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {roles.map((role) => {
                  const isChecked = selectedRoleIds.includes(role.id);

                  return (
                    <div
                      key={role.id}
                      onClick={() => handleToggleRole(role.id)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none",
                        isChecked
                          ? "bg-emerald-500/5 border-emerald-500/40 shadow-2xs"
                          : "bg-background border-border/70 hover:bg-muted/30 hover:border-border"
                      )}
                    >
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={isChecked}
                        onCheckedChange={() => handleToggleRole(role.id)}
                        className="mt-0.5 cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label
                            htmlFor={`role-${role.id}`}
                            className="font-semibold text-xs sm:text-sm text-foreground cursor-pointer"
                          >
                            {role.name}
                          </label>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                            {role.code}
                          </span>
                          {role.isSystem ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">
                              {t("iam.roles.systemRoleBadge")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              {t("iam.roles.customRoleBadge")}
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-3 pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-10 px-4 rounded-xl font-semibold cursor-pointer text-sm shadow-2xs hover:bg-muted/60"
          >
            {t("common.close")}
          </Button>

          {!isOwner && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || isLoading || selectedRoleIds.length === 0}
              className="h-10 px-5 rounded-xl font-semibold gap-2 cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  {t("common.save")}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
