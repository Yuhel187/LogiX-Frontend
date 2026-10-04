"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { createRoleApi, updateRoleApi } from "../../api/roles.api";
import type { RoleItem } from "../../schemas/role.schema";

interface CreateEditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleToEdit?: RoleItem | null;
  tenantId?: string;
  onSuccess: () => void;
}

interface RoleFormModalContentProps {
  roleToEdit?: RoleItem | null;
  tenantId?: string;
  onSuccess: () => void;
  onClose: () => void;
}

function RoleFormModalContent({
  roleToEdit,
  tenantId,
  onSuccess,
  onClose,
}: RoleFormModalContentProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(roleToEdit);

  const [name, setName] = useState(roleToEdit?.name || "");
  const [code, setCode] = useState(roleToEdit?.code || "");
  const [description, setDescription] = useState(roleToEdit?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = raw.toUpperCase().replace(/\s+/g, "_");
    setCode(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = t("iam.roles.roleNamePlaceholder");
    }

    if (!isEditing) {
      if (!code.trim() || code.trim().length < 2) {
        newErrors.code = t("iam.roles.roleCodePlaceholder");
      } else if (!/^[A-Z0-9_]+$/.test(code.trim())) {
        newErrors.code = t("iam.roles.codeValidation");
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && roleToEdit) {
        await updateRoleApi(roleToEdit.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        }, tenantId);
        toast.success(t("common.save"));
      } else {
        await createRoleApi({
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || undefined,
        }, tenantId);
        toast.success(t("iam.roles.createRole"));
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("common.error");
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">
          {isEditing ? t("iam.roles.editRole") : t("iam.roles.createRole")}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Tên vai trò */}
        <div className="space-y-1.5">
          <Label htmlFor="role-name">
            {t("iam.roles.roleName")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder={t("iam.roles.roleNamePlaceholder")}
            disabled={isSubmitting}
            className={errors.name ? "h-10 rounded-xl border-destructive focus-visible:ring-destructive" : "h-10 rounded-xl"}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Mã vai trò (Khóa khi chỉnh sửa) */}
        <div className="space-y-1.5">
          <Label htmlFor="role-code">
            {t("iam.roles.roleCode")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role-code"
            value={code}
            onChange={handleCodeChange}
            placeholder={t("iam.roles.roleCodePlaceholder")}
            disabled={isEditing || isSubmitting}
            className={errors.code ? "h-10 rounded-xl border-destructive focus-visible:ring-destructive" : "h-10 rounded-xl"}
          />
          {isEditing && (
            <p className="text-[11px] text-muted-foreground">
              {t("iam.roles.cannotChangeCode")}
            </p>
          )}
          {errors.code && (
            <p className="text-xs text-destructive">{errors.code}</p>
          )}
        </div>

        {/* Mô tả vai trò */}
        <div className="space-y-1.5">
          <Label htmlFor="role-desc">{t("iam.roles.description")}</Label>
          <Textarea
            id="role-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("iam.roles.descriptionPlaceholder")}
            disabled={isSubmitting}
            className="rounded-xl resize-none"
          />
        </div>
      </div>

      <DialogFooter className="flex flex-row items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-10 px-4 rounded-xl font-semibold cursor-pointer text-sm shadow-2xs hover:bg-muted/60"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 px-5 rounded-xl font-semibold cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
        >
          {isSubmitting ? t("common.saving") : isEditing ? t("common.save") : t("iam.roles.createRole")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateEditRoleDialog({
  open,
  onOpenChange,
  roleToEdit,
  tenantId,
  onSuccess,
}: CreateEditRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-6">
        {open && (
          <RoleFormModalContent
            key={roleToEdit?.id ?? "new"}
            roleToEdit={roleToEdit}
            tenantId={tenantId}
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
