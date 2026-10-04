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
  Mail,
  UserPlus,
  RefreshCw,
  Search,
  Copy,
  RotateCw,
  Ban,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { PermissionGuard } from "@/components/shared/permission-guard";
import {
  getInvitationsApi,
  resendInvitationApi,
  revokeInvitationApi,
  deleteInvitationApi,
} from "../../api/invitations.api";
import type { InvitationItem } from "../../schemas/invitation.schema";
import { InviteMemberDialog } from "./invite-member-dialog";

interface InvitationListViewProps {
  tenantId?: string;
}

export function InvitationListView({ tenantId }: InvitationListViewProps) {
  const { t } = useTranslation();
  const { activeTenant, hasPermission, isSuperAdmin, isOwner } = useAuth();

  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const canManage = isSuperAdmin || isOwner || hasPermission("iam:member:invite");
  const effectiveTenantId = tenantId || activeTenant?.id;

  const loadInvitations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getInvitationsApi(
        statusFilter === "ALL" ? undefined : statusFilter,
        effectiveTenantId
      );
      setInvitations(data);
      setNow(Date.now());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách lời mời";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, effectiveTenantId]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getInvitationsApi(
          statusFilter === "ALL" ? undefined : statusFilter,
          effectiveTenantId
        );
        if (isMounted) {
          setInvitations(data);
          setNow(Date.now());
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Không thể tải danh sách lời mời";
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [statusFilter, effectiveTenantId]);

  const filteredInvitations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return invitations.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.email.toLowerCase().includes(q) ||
        inv.inviter?.displayName?.toLowerCase().includes(q) ||
        inv.inviter?.email.toLowerCase().includes(q) ||
        inv.roles.some((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "ALL" || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invitations, searchQuery, statusFilter]);

  // Sao chép liên kết mời
  const handleCopyLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const inviteUrl = `${origin}/invite?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success(t("iam.invitations.copied"));
  };

  // Gửi lại lời mời
  const handleResend = async (id: string, email: string) => {
    setActionLoadingId(id);
    try {
      const res = await resendInvitationApi(id, effectiveTenantId);
      toast.success(t("iam.invitations.resendSuccess", { email }));
      if (res.inviteLink) {
        navigator.clipboard.writeText(res.inviteLink);
        toast.info(t("iam.invitations.copied"));
      }
      void loadInvitations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gửi lại lời mời thất bại";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Thu hồi lời mời
  const handleRevoke = async (id: string) => {
    setActionLoadingId(id);
    try {
      await revokeInvitationApi(id, effectiveTenantId);
      toast.success(t("iam.invitations.revokeSuccess"));
      void loadInvitations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thu hồi lời mời thất bại";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xóa lời mời
  const handleDelete = async (id: string) => {
    setActionLoadingId(id);
    try {
      await deleteInvitationApi(id, effectiveTenantId);
      toast.success(t("iam.invitations.deleteSuccess"));
      void loadInvitations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xóa lời mời thất bại";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Render status badge
  const renderStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = now > 0 && new Date(expiresAt).getTime() < now;
    const effectiveStatus = status === "PENDING" && isExpired ? "EXPIRED" : status;

    switch (effectiveStatus) {
      case "ACCEPTED":
        return (
          <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/30 gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3" />
            {t("iam.invitations.status.accepted")}
          </Badge>
        );
      case "REVOKED":
        return (
          <Badge variant="secondary" className="text-muted-foreground gap-1 text-[10px]">
            <Ban className="h-3 w-3" />
            {t("iam.invitations.status.revoked")}
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="outline" className="text-amber-600 bg-amber-500/10 border-amber-500/30 gap-1 text-[10px]">
            <AlertCircle className="h-3 w-3" />
            {t("iam.invitations.status.expired")}
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge variant="outline" className="text-blue-600 bg-blue-500/10 border-blue-500/30 gap-1 text-[10px]">
            <Clock className="h-3 w-3" />
            {t("iam.invitations.status.pending")}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Search, Filter Tabs & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex items-center min-w-[220px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("common.search") + " email, vai trò..."}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Status filters */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs">
            {(["ALL", "PENDING", "ACCEPTED", "REVOKED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "ALL" ? t("common.all") : t(`iam.invitations.status.${st.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={loadInvitations}
            disabled={isLoading}
            className="h-9 gap-1.5 px-3"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>

          <PermissionGuard permission="iam:member:invite">
            <Button
              onClick={() => setInviteDialogOpen(true)}
              size="xs"
              className="h-9 gap-1.5 px-3"
            >
              <UserPlus className="h-4 w-4" />
              {t("iam.invitations.inviteButton")}
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold text-xs text-foreground">
                {t("iam.invitations.table.email")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground">
                {t("iam.invitations.table.roles")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground">
                {t("iam.invitations.table.inviter")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground text-center">
                {t("iam.invitations.table.status")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground">
                {t("iam.invitations.table.expiresAt")}
              </TableHead>
              <TableHead className="font-semibold text-xs text-foreground text-right pr-6">
                {t("iam.invitations.table.actions")}
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
            ) : filteredInvitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredInvitations.map((inv) => {
                const isPending = inv.status === "PENDING";
                const isExpired = now > 0 && new Date(inv.expiresAt).getTime() < now;
                const isActionLoading = actionLoadingId === inv.id;

                return (
                  <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                    {/* Email */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-xs text-foreground">{inv.email}</span>
                      </div>
                    </TableCell>

                    {/* Roles */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {inv.roles?.map((r) => (
                          <Badge
                            key={r.id}
                            variant={r.code === "OWNER" ? "default" : "secondary"}
                            className="text-[10px] font-medium"
                          >
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>

                    {/* Inviter */}
                    <TableCell className="text-xs text-muted-foreground">
                      <div>
                        <span className="text-foreground font-medium block">
                          {inv.inviter?.displayName || t("iam.roles.adminRole")}
                        </span>
                        <span className="text-[11px] font-mono">{inv.inviter?.email}</span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {renderStatusBadge(inv.status, inv.expiresAt)}
                    </TableCell>

                    {/* Expiry */}
                    <TableCell className="text-xs text-muted-foreground">
                      <span title={new Date(inv.expiresAt).toLocaleString("vi-VN")}>
                        {new Date(inv.expiresAt).toLocaleDateString("vi-VN")}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Copy invite link button */}
                        {isPending && !isExpired && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title={t("iam.invitations.copyLink")}
                            onClick={() => handleCopyLink(inv.id)}
                            disabled={isActionLoading}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Resend button */}
                        {canManage && (isPending || isExpired || inv.status === "REVOKED") && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                            title={t("iam.invitations.resend")}
                            onClick={() => handleResend(inv.id, inv.email)}
                            disabled={isActionLoading}
                          >
                            <RotateCw className={`h-3.5 w-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
                          </Button>
                        )}

                        {/* Revoke button */}
                        {canManage && isPending && !isExpired && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-8 w-8 p-0 text-amber-600/80 hover:text-amber-600 hover:bg-amber-500/10"
                            title="Thu hồi lời mời"
                            onClick={() => handleRevoke(inv.id)}
                            disabled={isActionLoading}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Delete button */}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                            title={t("iam.invitations.delete")}
                            onClick={() => handleDelete(inv.id)}
                            disabled={isActionLoading}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        tenantId={effectiveTenantId}
        onSuccess={loadInvitations}
      />
    </div>
  );
}
