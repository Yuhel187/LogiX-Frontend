"use client";

import { formatIdentityError } from "../../utils/error-formatter";

import React, { useState, useEffect, useEffectEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Mail, Copy, Check, Info, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getRolesApi } from "../../api/roles.api";
import { createInvitationApi } from "../../api/invitations.api";
import type { RoleItem } from "../../schemas/role.schema";
import { formatDateTime } from "@/lib/format";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string;
  onSuccess: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  tenantId,
  onSuccess,
}: InviteMemberDialogProps) {
  const { t, locale } = useTranslation();
  const { activeTenant, isSuperAdmin, isOwner } = useAuth();

  const [email, setEmail] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    inviteLink: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailError, setEmailError] = useState("");

  const effectiveTenantId = tenantId || activeTenant?.id;
  const notifyLoadError = useEffectEvent((err: unknown) => {
    toast.error(formatIdentityError(err, t, "tenant.loadRolesError"));
  });

  const handleDialogChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    if (!nextOpen) {
      setEmail("");
      setSelectedRoleIds([]);
      setInviteResult(null);
      setCopied(false);
      setEmailError("");
    }
    onOpenChange(nextOpen);
  };

  // Tải danh sách vai trò khả dụng khi mở dialog
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    (async () => {
      setIsLoadingRoles(true);
      setRolesLoaded(false);
      setSelectedRoleIds([]);
      setRoles([]);
      try {
        const data = await getRolesApi(effectiveTenantId);
        if (isMounted) {
          // Bỏ qua vai trò SUPER_ADMIN
          const availableRoles = data.filter((r) => r.code !== "SUPER_ADMIN");
          setRoles(availableRoles);
          setRolesLoaded(true);

          // Mặc định chọn vai trò MEMBER nếu có
          const memberRole = availableRoles.find((r) => r.code === "MEMBER");
          if (memberRole) {
            setSelectedRoleIds([memberRole.id]);
          }
        }
      } catch (err: unknown) {
        if (isMounted) notifyLoadError(err);
      } finally {
        if (isMounted) {
          setIsLoadingRoles(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, effectiveTenantId]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError("phase5.emailInvalid");
      return;
    }
    if (selectedRoleIds.length === 0) {
      toast.error(t("phase5.rolesRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createInvitationApi(
        {
          email: cleanEmail,
          roleIds: selectedRoleIds,
        },
        effectiveTenantId,
      );

      setInviteResult({
        inviteLink: res.inviteLink,
        expiresAt: res.expiresAt,
      });

      toast.success(t("iam.invitations.sendSuccess", { email: cleanEmail }));
      onSuccess();
    } catch (err: unknown) {
      const msg = formatIdentityError(err, t, "phase5.sendInvitationError");
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteResult?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteResult.inviteLink);
      setCopied(true);
      toast.success(t("iam.invitations.copied"));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t("phase5.copyError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px]">
        {inviteResult ? (
          // Màn hình kết quả sau khi tạo lời mời thành công
          <div className="space-y-4 py-2">
            <DialogHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5 mx-auto mb-2">
                <Check className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-lg font-bold">
                {t("phase5.invitationCreated")}
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                {t("phase5.invitationCreatedDesc", { email })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label
                htmlFor="created-invite-link"
                className="text-xs font-medium"
              >
                {t("phase5.inviteLinkLabel")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="created-invite-link"
                  readOnly
                  value={inviteResult.inviteLink}
                  className="font-mono text-xs select-all bg-muted/40 h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleCopyLink}
                  className="h-9 gap-1 px-3 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      {t("iam.invitations.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      {t("iam.invitations.copyLink")}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("phase5.inviteExpires", {
                  date: formatDateTime(inviteResult.expiresAt, locale),
                })}
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => onOpenChange(false)} className="w-full">
                {t("common.close")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Form nhập thông tin lời mời
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("iam.invitations.dialogTitle")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("iam.invitations.dialogDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nhập Email */}
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">
                  {t("iam.invitations.emailLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    placeholder={t("iam.invitations.emailPlaceholder")}
                    disabled={isSubmitting}
                    className={`h-9 pl-9 ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-destructive">{t(emailError)}</p>
                )}
              </div>

              {/* Danh sách vai trò chỉ định trước */}
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-semibold">
                    {t("iam.invitations.rolesLabel")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {t("iam.invitations.rolesHint")}
                  </p>
                </div>

                {isLoadingRoles ? (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {t("phase5.loadingRoles")}
                  </div>
                ) : !rolesLoaded ? (
                  <p role="alert" className="text-xs text-destructive">
                    {t("phase5.loadFailed")}
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border/70 p-2 space-y-1 divide-y divide-border/40">
                    {roles.map((r) => {
                      const isOwnerRole = r.code === "OWNER";
                      // Chỉ Owner hoặc SuperAdmin mới được chỉ định vai trò Owner
                      const canAssignThisRole =
                        !isOwnerRole || isSuperAdmin || isOwner;
                      const isChecked = selectedRoleIds.includes(r.id);

                      return (
                        <div
                          key={r.id}
                          className={`flex items-start gap-2.5 pt-1.5 first:pt-0 pb-1.5 ${
                            !canAssignThisRole
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                        >
                          <Checkbox
                            id={`role-${r.id}`}
                            checked={isChecked}
                            disabled={!canAssignThisRole || isSubmitting}
                            onCheckedChange={() =>
                              canAssignThisRole && toggleRole(r.id)
                            }
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`role-${r.id}`}
                            className={`flex-1 text-xs select-none ${
                              canAssignThisRole
                                ? "cursor-pointer"
                                : "cursor-not-allowed"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">
                                {r.name}
                              </span>
                              <Badge
                                variant={r.isSystem ? "default" : "secondary"}
                                className="text-[9px] px-1 py-0"
                              >
                                {r.code}
                              </Badge>
                            </div>
                            {r.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {r.description}
                              </p>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Chú thích giới hạn quyền OWNER */}
                {!isSuperAdmin && !isOwner && (
                  <div className="flex items-start gap-1.5 rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>{t("iam.invitations.roleOwnerNotice")}</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isLoadingRoles ||
                  !rolesLoaded ||
                  selectedRoleIds.length === 0
                }
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("iam.invitations.sending")}
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    {t("iam.invitations.sendInvite")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
