"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  Plus,
  Search,
  Lock,
  Edit2,
  Trash2,
  Users,
  Key,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { getRolesApi } from "../../api/roles.api";
import type { RoleItem } from "../../schemas/role.schema";
import { cn } from "@/lib/utils";
import { CreateEditRoleDialog } from "./create-edit-role-dialog";
import { DeleteRoleDialog } from "./delete-role-dialog";
import { RolePermissionMatrixDialog } from "./role-permission-matrix-dialog";

interface RoleListViewProps {
  tenantId?: string;
}

export function RoleListView({ tenantId }: RoleListViewProps) {
  const { t } = useTranslation();
  const { activeTenant, hasPermission, isSuperAdmin, isOwner } = useAuth();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dialog states
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<RoleItem | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);

  const [matrixOpen, setMatrixOpen] = useState(false);
  const [roleForMatrix, setRoleForMatrix] = useState<RoleItem | null>(null);

  const canManage = isSuperAdmin || isOwner || hasPermission("iam:role:manage");

  const effectiveTenantId = tenantId || activeTenant?.id;

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRolesApi(effectiveTenantId);
      setRoles(data);
    } catch (err: any) {
      toast.error(err.message || t("tenant.loadRolesError"));
    } finally {
      setIsLoading(false);
    }
  }, [effectiveTenantId, t]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const filteredRoles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex items-center flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("tenant.searchRolesPlaceholder")}
            className="h-10 pl-10 pr-4 rounded-xl bg-background border-border/80 text-sm w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            onClick={loadRoles}
            disabled={isLoading}
            className="h-10 px-4 rounded-xl gap-2 font-semibold text-sm cursor-pointer shadow-2xs hover:bg-muted/60"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            {t("common.refresh")}
          </Button>

          <PermissionGuard permission="iam:role:manage">
            <Button
              onClick={() => {
                setRoleToEdit(null);
                setCreateEditOpen(true);
              }}
              className="h-10 px-4 rounded-xl gap-2 font-semibold text-sm cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Plus className="size-4" />
              {t("iam.roles.createRole")}
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Roles Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold text-xs text-foreground">
                {t("iam.roles.roleName")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground">
                {t("iam.roles.roleCode")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground">
                {t("iam.roles.table.type")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground text-center">
                {t("iam.roles.table.members")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground text-center">
                {t("iam.roles.table.permissions")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground text-right pr-6">
                {t("iam.roles.table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  {t("common.loading")}...
                </TableCell>
              </TableRow>
            ) : filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredRoles.map((role) => {
                const isOwnerRole = role.code === "OWNER";
                const isSystemRole = Boolean(role.isSystem);

                return (
                  <TableRow key={role.id} className="hover:bg-muted/30 transition-colors">
                    {/* Tên vai trò & Mô tả */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        {isOwnerRole ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Shield className="h-4 w-4" />
                          </div>
                        ) : isSystemRole ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Key className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-xs text-foreground flex items-center gap-1.5">
                            {role.name}
                            {isOwnerRole && (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                                {t("iam.roles.ownerFullAccess")}
                              </Badge>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Mã code */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {role.code}
                    </TableCell>

                    {/* Phân loại badge */}
                    <TableCell>
                      {isSystemRole ? (
                        <Badge variant="default" className="text-[10px] font-medium bg-primary/90">
                          {t("iam.roles.systemRoleBadge")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {t("iam.roles.customRoleBadge")}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Số thành viên */}
                    <TableCell className="text-center text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {role.memberCount || 0}
                      </span>
                    </TableCell>

                    {/* Số quyền hạn */}
                    <TableCell className="text-center text-xs">
                      {isOwnerRole ? (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {t("iam.roles.ownerFullAccess")}
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-medium text-foreground">
                          {t("iam.roles.permissionsCount", {
                            count: role.permissionCount || role.permissionIds?.length || 0,
                          })}
                        </span>
                      )}
                    </TableCell>

                    {/* Thao tác */}
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {isOwnerRole ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled
                            className="h-8 w-8 p-0 text-muted-foreground cursor-not-allowed"
                            title={t("iam.roles.ownerFullAccess")}
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <>
                            {/* Nút ma trận phân quyền */}
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title={t("iam.matrix.title")}
                              onClick={() => {
                                setRoleForMatrix(role);
                                setMatrixOpen(true);
                              }}
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              <span className="hidden md:inline">{t("iam.matrix.title")}</span>
                            </Button>

                            {/* Nút chỉnh sửa (chỉ cho custom role) */}
                            {!isSystemRole && canManage && (
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                title={t("iam.roles.editRole")}
                                onClick={() => {
                                  setRoleToEdit(role);
                                  setCreateEditOpen(true);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {/* Nút xóa vai trò (chỉ cho custom role) */}
                            {!isSystemRole && canManage && (
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                title={t("iam.roles.deleteRole")}
                                onClick={() => {
                                  setRoleToDelete(role);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <CreateEditRoleDialog
        open={createEditOpen}
        onOpenChange={setCreateEditOpen}
        roleToEdit={roleToEdit}
        tenantId={effectiveTenantId}
        onSuccess={loadRoles}
      />

      <DeleteRoleDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        role={roleToDelete}
        tenantId={effectiveTenantId}
        onSuccess={loadRoles}
      />

      <RolePermissionMatrixDialog
        open={matrixOpen}
        onOpenChange={setMatrixOpen}
        role={roleForMatrix}
        tenantId={effectiveTenantId}
        onSuccess={loadRoles}
      />
    </div>
  );
}
