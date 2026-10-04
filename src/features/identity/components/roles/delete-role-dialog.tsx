"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { deleteRoleApi } from "../../api/roles.api";
import type { RoleItem } from "../../schemas/role.schema";

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleItem | null;
  tenantId?: string;
  onSuccess: () => void;
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  role,
  tenantId,
  onSuccess,
}: DeleteRoleDialogProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!role) return null;

  const hasMembers = (role.memberCount || 0) > 0;
  const isSystemRole = Boolean(role.isSystem);

  const handleDelete = async () => {
    if (isSystemRole || hasMembers) return;

    setIsDeleting(true);
    try {
      await deleteRoleApi(role.id, tenantId);
      toast.success(t("common.save"));
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("iam.roles.deleteFailed");
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[440px] rounded-2xl p-6">
        <AlertDialogHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-8 ring-destructive/5 mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <AlertDialogTitle className="text-center text-lg font-semibold text-foreground">
            {t("iam.roles.deleteConfirmTitle")}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-center text-sm text-muted-foreground leading-relaxed">
            {t("iam.roles.deleteConfirmDesc", { name: role.name })}
          </AlertDialogDescription>

          {/* Cảnh báo nếu là vai trò hệ thống */}
          {isSystemRole && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-left text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("iam.roles.cannotDeleteSystemRole")}</span>
            </div>
          )}

          {/* Cảnh báo nếu đang có thành viên */}
          {!isSystemRole && hasMembers && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-left text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("iam.roles.cannotDeleteRoleWithMembers", { count: role.memberCount })}</span>
            </div>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex flex-row items-center justify-end gap-3 sm:space-x-0">
          <AlertDialogCancel
            disabled={isDeleting}
            className="h-10 px-4 rounded-xl font-semibold cursor-pointer text-sm shadow-2xs hover:bg-muted/60"
          >
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={isDeleting || isSystemRole || hasMembers}
            className="h-10 px-5 rounded-xl font-semibold cursor-pointer text-sm shadow-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? t("common.deleting") : t("iam.roles.deleteRole")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
