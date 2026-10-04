"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCheck, Eye, XSquare, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { getAllPermissionsApi, updateRolePermissionsApi, getRoleByIdApi } from "../../api/roles.api";
import type { RoleItem, PermissionItem } from "../../schemas/role.schema";

interface RolePermissionMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleItem | null;
  tenantId?: string;
  onSuccess: () => void;
}

export function RolePermissionMatrixDialog({
  open,
  onOpenChange,
  role,
  tenantId,
  onSuccess,
}: RolePermissionMatrixDialogProps) {
  const { t } = useTranslation();

  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isOwnerRole = role?.code === "OWNER";

  // Tải danh mục quyền và danh sách quyền hiện tại của vai trò
  useEffect(() => {
    if (!open || !role) return;

    let isMounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const [perms, roleDetail] = await Promise.all([
          getAllPermissionsApi(),
          getRoleByIdApi(role.id, tenantId).catch(() => role),
        ]);

        if (isMounted) {
          setAllPermissions(perms);
          const currentIds = new Set<string>(roleDetail.permissionIds || []);
          setSelectedIds(currentIds);
        }
      } catch (err: any) {
        toast.error(err.message || t("iam.matrix.loadError"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, role, tenantId]);

  // Nhóm danh mục quyền theo Module và Resource
  const groupedModules = useMemo(() => {
    const modulesMap = new Map<string, Map<string, PermissionItem[]>>();

    for (const perm of allPermissions) {
      if (!modulesMap.has(perm.module)) {
        modulesMap.set(perm.module, new Map());
      }
      const resourceMap = modulesMap.get(perm.module)!;
      if (!resourceMap.has(perm.resource)) {
        resourceMap.set(perm.resource, []);
      }
      resourceMap.get(perm.resource)!.push(perm);
    }

    return Array.from(modulesMap.entries()).map(([moduleName, resourceMap]) => ({
      module: moduleName,
      resources: Array.from(resourceMap.entries()).map(([resourceName, perms]) => ({
        resource: resourceName,
        permissions: perms,
      })),
    }));
  }, [allPermissions]);

  // Xử lý toggle một quyền
  const togglePermission = (permId: string) => {
    if (isOwnerRole) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  // Chọn toàn bộ quyền trong 1 phân hệ
  const selectAllInModule = (modulePerms: PermissionItem[]) => {
    if (isOwnerRole) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        next.add(p.id);
      }
      return next;
    });
  };

  // Chỉ cấp quyền xem (read) trong 1 phân hệ
  const selectOnlyReadInModule = (modulePerms: PermissionItem[]) => {
    if (isOwnerRole) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (p.action === "read") {
          next.add(p.id);
        } else {
          next.delete(p.id);
        }
      }
      return next;
    });
  };

  // Bỏ chọn tất cả quyền trong 1 phân hệ
  const clearAllInModule = (modulePerms: PermissionItem[]) => {
    if (isOwnerRole) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        next.delete(p.id);
      }
      return next;
    });
  };

  // Lưu ma trận phân quyền
  const handleSave = async () => {
    if (!role || isOwnerRole) return;

    setIsSaving(true);
    try {
      await updateRolePermissionsApi(role.id, Array.from(selectedIds), tenantId);
      toast.success(t("iam.matrix.saveSuccess"));
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || t("iam.matrix.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-center justify-between pr-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <DialogTitle className="text-lg font-bold">
                  {t("iam.matrix.title")} - {role.name}
                </DialogTitle>
                <Badge variant={role.isSystem ? "default" : "secondary"} className="text-[10px] font-mono">
                  {role.code}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
                {role.description || t("iam.roles.descriptionPlaceholder")}
              </DialogDescription>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {isOwnerRole ? t("iam.roles.ownerFullAccess") : t("tenant.selectedCount", { count: selectedIds.size })}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Nội dung ma trận */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">{t("iam.matrix.loadingPermissions")}</p>
            </div>
          ) : isOwnerRole ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-2">
              <Shield className="h-10 w-10 text-primary mx-auto" />
              <h3 className="font-semibold text-foreground text-sm">{t("iam.matrix.ownerRoleTitle")}</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {t("iam.matrix.ownerRoleDesc")}
              </p>
            </div>
          ) : (
            groupedModules.map(({ module, resources }) => {
              const allModulePerms = resources.flatMap((r) => r.permissions);
              const moduleLabel = t(`iam.modules.${module}`) || module;

              return (
                <div
                  key={module}
                  className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs"
                >
                  {/* Tiêu đề phân hệ & Nút thao tác nhanh */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-muted/40 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <h4 className="font-semibold text-sm text-foreground">{moduleLabel}</h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => selectAllInModule(allModulePerms)}
                      >
                        <CheckCheck className="h-3 w-3" />
                        {t("iam.matrix.selectAllModule")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => selectOnlyReadInModule(allModulePerms)}
                      >
                        <Eye className="h-3 w-3" />
                        {t("iam.matrix.selectOnlyRead")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => clearAllInModule(allModulePerms)}
                      >
                        <XSquare className="h-3 w-3" />
                        {t("iam.matrix.deselectAll")}
                      </Button>
                    </div>
                  </div>

                  {/* Bảng phân quyền chi tiết của từng resource */}
                  <div className="divide-y divide-border/50">
                    {resources.map(({ resource, permissions }) => {
                      const resourceLabel = t(`iam.resources.${resource}`) || resource;

                      return (
                        <div
                          key={resource}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
                        >
                          <div className="sm:w-1/3 min-w-[180px]">
                            <span className="text-xs font-semibold text-foreground">
                              {resourceLabel}
                            </span>
                            <span className="block text-[11px] text-muted-foreground font-mono">
                              {resource}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:w-2/3 sm:justify-end">
                            {permissions.map((perm) => {
                              const isChecked = selectedIds.has(perm.id);
                              const actionLabel = t(`iam.matrix.actions.${perm.action}`) || perm.action;

                              return (
                                <label
                                  key={perm.id}
                                  className={`inline-flex items-center gap-2 cursor-pointer text-xs select-none rounded-lg px-2.5 py-1.5 border transition-all ${
                                    isChecked
                                      ? "bg-primary/10 border-primary/30 text-primary font-medium shadow-2xs"
                                      : "bg-muted/40 border-border/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => togglePermission(perm.id)}
                                  />
                                  <span>
                                    {actionLabel}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 sm:justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {!isOwnerRole && t("tenant.selectedCount", { count: selectedIds.size })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-10 px-4 rounded-xl font-semibold cursor-pointer text-sm shadow-2xs hover:bg-muted/60"
            >
              {t("common.close")}
            </Button>
            {!isOwnerRole && (
              <Button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="h-10 px-5 rounded-xl font-semibold gap-2 cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("common.saving")}
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    {t("iam.matrix.savePermissions")}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
