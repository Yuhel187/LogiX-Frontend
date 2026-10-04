"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  RotateCw,
  Search,
  MoreHorizontal,
  Trash2,
  Mail,
  Copy,
  Send,
  Ban,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  getOrganizationMembersApi,
  removeMemberApi,
} from "../../api/auth.api";
import {
  getInvitationsApi,
  resendInvitationApi,
  revokeInvitationApi,
  deleteInvitationApi,
} from "../../api/invitations.api";
import type { OrgMember } from "../../schemas/auth.schema";
import type { InvitationItem } from "../../schemas/invitation.schema";
import { InviteMemberDialog } from "./invite-member-dialog";
import { ManageMemberRolesDialog } from "./manage-member-roles-dialog";

interface UnifiedMembersViewProps {
  tenantId: string;
}

type StatusFilter = "ALL" | "ACTIVE" | "PENDING" | "OTHER";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export function UnifiedMembersView({ tenantId }: UnifiedMembersViewProps) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [now, setNow] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Dialog & Action states
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [memberToManageRoles, setMemberToManageRoles] = useState<OrgMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<OrgMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const [invitationToRevoke, setInvitationToRevoke] = useState<InvitationItem | null>(null);
  const [isRevokingInvitation, setIsRevokingInvitation] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load both active members and invitations
  const loadData = useCallback(async () => {
    try {
      const [membersData, invitationsData] = await Promise.all([
        getOrganizationMembersApi(tenantId).catch(() => [] as OrgMember[]),
        getInvitationsApi(undefined, tenantId).catch(() => [] as InvitationItem[]),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
      setNow(Date.now());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("tenant.loadMembersError");
      toast.error(msg);
    }
  }, [tenantId, t]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      await loadData();
      if (isMounted) setIsLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success(t("tenant.refreshSuccess"));
  };

  // -------------------------------------------------------------
  // MEMBER ACTIONS
  // -------------------------------------------------------------
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;

    // Không cho phép tự khai trừ bản thân
    if (memberToRemove.userId === user?.id) {
      toast.error(t("tenant.cannotRemoveSelf"));
      setMemberToRemove(null);
      return;
    }

    // Không cho phép khai trừ OWNER
    if (memberToRemove.role === "OWNER") {
      toast.error(t("tenant.cannotRemoveOwner"));
      setMemberToRemove(null);
      return;
    }

    setIsRemovingMember(true);
    try {
      await removeMemberApi(tenantId, memberToRemove.id);
      toast.success(t("tenant.removeMemberSuccess", { name: memberToRemove.displayName }));
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      setMemberToRemove(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("tenant.removeMemberError");
      toast.error(msg);
    } finally {
      setIsRemovingMember(false);
    }
  };

  // -------------------------------------------------------------
  // INVITATION ACTIONS
  // -------------------------------------------------------------
  const handleCopyInviteLink = async (inv: InvitationItem) => {
    setActionLoadingId(inv.id);
    try {
      const res = await resendInvitationApi(inv.id, tenantId);
      if (res.inviteLink) {
        navigator.clipboard.writeText(res.inviteLink);
        toast.success(t("tenant.copyInviteLinkSuccess"));
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("tenant.copyInviteLinkError");
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResendInvitation = async (inv: InvitationItem) => {
    setActionLoadingId(inv.id);
    try {
      const res = await resendInvitationApi(inv.id, tenantId);
      toast.success(t("tenant.resendInviteSuccess", { email: inv.email }));
      if (res.inviteLink) {
        navigator.clipboard.writeText(res.inviteLink);
        toast.info(t("tenant.copyNewInviteLinkSuccess"));
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("tenant.resendInviteError");
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmRevokeInvitation = async () => {
    if (!invitationToRevoke) return;
    setIsRevokingInvitation(true);
    try {
      await revokeInvitationApi(invitationToRevoke.id, tenantId);
      toast.success(t("tenant.revokeInviteSuccess", { email: invitationToRevoke.email }));
      setInvitationToRevoke(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("tenant.revokeInviteError");
      toast.error(msg);
    } finally {
      setIsRevokingInvitation(false);
    }
  };

  const handleDeleteInvitation = async (invId: string) => {
    setActionLoadingId(invId);
    try {
      await deleteInvitationApi(invId, tenantId);
      toast.success(t("tenant.deleteInviteSuccess"));
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("tenant.deleteInviteError");
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // -------------------------------------------------------------
  // COUNTS & FILTERING
  // -------------------------------------------------------------
  // Bỏ qua lời mời đã tham gia (ACCEPTED) hoặc người dùng đã có trong danh sách thành viên chính thức
  const activeMemberEmails = useMemo(
    () => new Set(members.map((m) => m.email.toLowerCase())),
    [members]
  );

  const pendingInvitations = useMemo(
    () =>
      invitations.filter(
        (i) => i.status === "PENDING" && !activeMemberEmails.has(i.email.toLowerCase())
      ),
    [invitations, activeMemberEmails]
  );

  const otherInvitations = useMemo(
    () =>
      invitations.filter(
        (i) =>
          (i.status === "REVOKED" || i.status === "EXPIRED") &&
          !activeMemberEmails.has(i.email.toLowerCase())
      ),
    [invitations, activeMemberEmails]
  );

  const activeCount = members.length;
  const pendingCount = pendingInvitations.length;
  const otherCount = otherInvitations.length;
  const totalCount = activeCount + pendingCount + otherCount;

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (statusFilter === "PENDING" || statusFilter === "OTHER") return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
    );
  }, [members, searchQuery, statusFilter]);

  // Filtered invitations
  const filteredInvitations = useMemo(() => {
    if (statusFilter === "ACTIVE") return [];
    const q = searchQuery.toLowerCase().trim();
    const candidateList =
      statusFilter === "PENDING"
        ? pendingInvitations
        : statusFilter === "OTHER"
        ? otherInvitations
        : [...pendingInvitations, ...otherInvitations];

    return candidateList.filter((inv) => {
      if (!q) return true;
      return (
        inv.email.toLowerCase().includes(q) ||
        inv.inviter?.displayName?.toLowerCase().includes(q) ||
        inv.inviter?.email?.toLowerCase().includes(q) ||
        inv.roles.some((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
      );
    });
  }, [pendingInvitations, otherInvitations, searchQuery, statusFilter]);

  const isEmpty = filteredMembers.length === 0 && filteredInvitations.length === 0;

  return (
    <div className="space-y-6 w-full">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Users className="size-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t("tenant.membersAndInvitationsTitle")}</span>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full font-semibold">
              {totalCount}
            </Badge>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t("tenant.membersAndInvitationsSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
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

      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        tenantId={tenantId}
        onSuccess={() => {
          void loadData();
        }}
      />

      <ManageMemberRolesDialog
        open={Boolean(memberToManageRoles)}
        onOpenChange={(open) => !open && setMemberToManageRoles(null)}
        member={memberToManageRoles}
        tenantId={tenantId}
        onSuccess={() => {
          void loadData();
        }}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("tenant.searchMembersPlaceholder")}
            className="h-10 pl-10 pr-4 rounded-xl bg-background border-border/80 text-sm w-full"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/70 text-xs shrink-0 self-start sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap",
              statusFilter === "ALL"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("tenant.statusAll")} ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap",
              statusFilter === "ACTIVE"
                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("tenant.statusActive")} ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap",
              statusFilter === "PENDING"
                ? "bg-background text-amber-600 dark:text-amber-400 shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("tenant.statusPending")} ({pendingCount})
          </button>
          {otherCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter("OTHER")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap",
                statusFilter === "OTHER"
                  ? "bg-background text-muted-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("tenant.statusRevoked")} ({otherCount})
            </button>
          )}
        </div>
      </div>

      {/* Bảng Thành viên & Lời mời Hợp nhất */}
      <div className="rounded-2xl border border-border/70 overflow-hidden bg-background shadow-xs">
        {/* Table Header */}
        <div className="grid grid-cols-12 items-center px-6 py-3.5 bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          <div className="col-span-5 text-left">{t("tenant.colNameEmail")}</div>
          <div className="col-span-3 text-left">{t("tenant.colRole")}</div>
          <div className="col-span-2 text-center">{t("tenant.colStatus")}</div>
          <div className="col-span-2 text-right">{t("tenant.colActions")}</div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-6 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span>{t("tenant.loadingMembers")}</span>
          </div>
        ) : isEmpty ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Users className="size-8 text-muted-foreground/40 mb-1" />
            <p className="font-semibold text-foreground">{t("tenant.noRecordsFound")}</p>
            <p className="text-xs text-muted-foreground">
              {t("tenant.noRecordsFoundHint")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {/* 1. Danh sách Thành viên Đang hoạt động */}
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
                  key={`member-${member.id}`}
                  className="grid grid-cols-12 items-center px-6 py-4 hover:bg-muted/15 transition-colors"
                >
                  {/* Cột 1: Tên và Email */}
                  <div className="col-span-5 flex items-center gap-3.5 min-w-0 pr-2">
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
                      <span className="text-xs text-muted-foreground truncate block mt-0.5 font-mono">
                        {member.email}
                      </span>
                    </div>
                  </div>

                  {/* Cột 2: Vai trò */}
                  <div className="col-span-3 flex items-center flex-wrap gap-1.5 pr-2">
                    {member.role === "OWNER" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs">
                        {t("tenant.ownerRole")}
                      </span>
                    )}
                    {member.role === "ADMIN" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-2xs">
                        {t("tenant.adminRole")}
                      </span>
                    )}
                    {member.role === "MEMBER" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60">
                        {t("tenant.memberRole")}
                      </span>
                    )}
                  </div>

                  {/* Cột 3: Trạng thái */}
                  <div className="col-span-2 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {t("tenant.statusActive")}
                    </span>
                  </div>

                  {/* Cột 4: Thao tác */}
                  <div className="col-span-2 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <MoreHorizontal className="size-5" />
                          <span className="sr-only">{t("tenant.colActions")}</span>
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="w-56 p-1.5 rounded-xl shadow-lg border border-border/80 bg-popover"
                      >
                        {isCurrentUser ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                            <span className="font-medium text-foreground block mb-0.5">{t("tenant.yourAccount")}</span>
                            {t("tenant.selfProtectionNotice")}
                          </div>
                        ) : member.role === "OWNER" ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                            <span className="font-medium text-blue-600 dark:text-blue-400 block mb-0.5 flex items-center justify-center gap-1.5">
                              <Shield className="size-3.5" /> {t("tenant.ownerRole")}
                            </span>
                            {t("tenant.ownerProtectionNotice")}
                          </div>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={() => setMemberToManageRoles(member)}
                              className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg cursor-pointer font-medium text-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                            >
                              <Shield className="size-4 text-emerald-600 dark:text-emerald-400" />
                              <span>{t("tenant.manageRoles")}</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-border/60" />

                            <DropdownMenuItem
                              onClick={() => setMemberToRemove(member)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 font-medium cursor-pointer rounded-lg px-2.5 py-2 text-sm flex items-center gap-2"
                            >
                              <Trash2 className="size-4 text-destructive" />
                              <span>{t("tenant.removeMember")}</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}

            {/* 2. Danh sách Lời mời tham gia */}
            {filteredInvitations.map((inv) => {
              const isPending = inv.status === "PENDING";
              const isExpired = now > 0 && new Date(inv.expiresAt).getTime() < now;
              const isActionLoading = actionLoadingId === inv.id;

              return (
                <div
                  key={`inv-${inv.id}`}
                  className="grid grid-cols-12 items-center px-6 py-4 hover:bg-muted/15 transition-colors bg-amber-500/[0.02]"
                >
                  {/* Cột 1: Email và Người mời */}
                  <div className="col-span-5 flex items-center gap-3.5 min-w-0 pr-2">
                    <div className="size-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
                      <Mail className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm sm:text-base text-foreground truncate font-mono">
                          {inv.email}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {t("iam.invitations.invitedBy")}: {inv.inviter?.displayName || inv.inviter?.email || t("tenant.adminRole")}
                        {isPending && ` • ${t("iam.invitations.table.expiresAt")}: ${formatDate(inv.expiresAt)}`}
                      </span>
                    </div>
                  </div>

                  {/* Cột 2: Vai trò chỉ định trước */}
                  <div className="col-span-3 flex items-center flex-wrap gap-1.5 pr-2">
                    {inv.roles && inv.roles.length > 0 ? (
                      inv.roles.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                        >
                          {r.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">{t("tenant.defaultRole")}</span>
                    )}
                  </div>

                  {/* Cột 3: Trạng thái */}
                  <div className="col-span-2 flex justify-center">
                    {isPending ? (
                      isExpired ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          <AlertCircle className="size-3" />
                          {t("iam.invitations.status.expired")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="size-3" />
                          {t("tenant.statusPending")}
                        </span>
                      )
                    ) : inv.status === "ACCEPTED" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="size-3" />
                        {t("iam.invitations.status.accepted")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                        <Ban className="size-3" />
                        {t("tenant.statusRevoked")}
                      </span>
                    )}
                  </div>

                  {/* Cột 4: Thao tác */}
                  <div className="col-span-2 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isActionLoading}
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {isActionLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="size-5" />
                          )}
                          <span className="sr-only">{t("tenant.colActions")}</span>
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="w-56 p-1.5 rounded-xl shadow-lg border border-border/80 bg-popover"
                      >
                        <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase px-2.5 py-1.5">
                          {t("iam.invitations.actions") || t("tenant.colActions")}
                        </DropdownMenuLabel>

                        <DropdownMenuItem
                          onClick={() => handleCopyInviteLink(inv)}
                          className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg cursor-pointer"
                        >
                          <Copy className="size-4 text-muted-foreground" />
                          <span>{t("iam.invitations.copyLink")}</span>
                        </DropdownMenuItem>

                        {isPending && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleResendInvitation(inv)}
                              className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg cursor-pointer"
                            >
                              <Send className="size-4 text-muted-foreground" />
                              <span>{t("iam.invitations.resend")}</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-border/60" />

                            <DropdownMenuItem
                              onClick={() => setInvitationToRevoke(inv)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 font-medium cursor-pointer rounded-lg px-2.5 py-2 text-sm flex items-center gap-2"
                            >
                              <Ban className="size-4 text-destructive" />
                              <span>{t("tenant.revokeInvite") || t("iam.invitations.table.revoke")}</span>
                            </DropdownMenuItem>
                          </>
                        )}

                        {(inv.status === "REVOKED" || inv.status === "EXPIRED" || inv.status === "ACCEPTED") && (
                          <>
                            <DropdownMenuSeparator className="my-1 border-border/60" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteInvitation(inv.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 font-medium cursor-pointer rounded-lg px-2.5 py-2 text-sm flex items-center gap-2"
                            >
                              <Trash2 className="size-4 text-destructive" />
                              <span>{t("iam.invitations.delete")}</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog xác nhận Khai trừ thành viên */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {t("tenant.removeConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {t("tenant.removeConfirmPrompt", {
                name: memberToRemove?.displayName || "",
                email: memberToRemove?.email || "",
              })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMemberToRemove(null)}
              disabled={isRemovingMember}
              className="h-10 px-4 rounded-xl font-semibold cursor-pointer text-sm shadow-2xs hover:bg-muted/60"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRemoveMember}
              disabled={isRemovingMember}
              className="h-10 px-4 rounded-xl font-semibold cursor-pointer shadow-xs gap-2 text-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isRemovingMember ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("common.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  {t("tenant.removeConfirmButton")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận Thu hồi lời mời */}
      <Dialog open={!!invitationToRevoke} onOpenChange={(open) => !open && setInvitationToRevoke(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {t("iam.invitations.revokeConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {t("iam.invitations.revokeConfirmDesc", {
                email: invitationToRevoke?.email || "",
              })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInvitationToRevoke(null)}
              disabled={isRevokingInvitation}
              className="h-10 px-4 rounded-xl font-semibold cursor-pointer text-sm shadow-2xs hover:bg-muted/60"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRevokeInvitation}
              disabled={isRevokingInvitation}
              className="h-10 px-4 rounded-xl font-semibold gap-2 cursor-pointer shadow-xs text-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isRevokingInvitation ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("common.deleting")}
                </>
              ) : (
                <>
                  <Ban className="size-4" />
                  {t("tenant.revokeInvite") || t("iam.invitations.table.revoke")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
