"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Info,
  Link2,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { OrgMember, RoleItem } from "@/features/identity";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { createBroadcastApi } from "../api/broadcasts.api";
import {
  BROADCAST_AUDIENCE_KINDS,
  BROADCAST_LIMITS,
  BROADCAST_LINK_PRESETS,
  type BroadcastAudienceKind,
} from "../constants/notification-permissions";
import {
  buildBroadcastPayloadFingerprint,
  isValidBroadcastLink,
  type BroadcastAudience,
  type CreateBroadcastPayload,
  type CreateBroadcastResponse,
} from "../schemas/broadcast.schema";
import {
  NOTIFICATION_SEVERITIES,
  type NotificationSeverity,
} from "../schemas/notification.schema";
import { formatBroadcastAudienceSummary } from "./broadcast-badges";

export interface DirectoryLookupState<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  forbidden: boolean;
  onRetry: () => void;
}

interface CreateBroadcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rolesState: DirectoryLookupState<RoleItem>;
  membersState: DirectoryLookupState<OrgMember>;
  onCreated: (result: CreateBroadcastResponse) => void;
}

export function CreateBroadcastDialog({
  open,
  onOpenChange,
  rolesState,
  membersState,
  onCreated,
}: CreateBroadcastDialogProps) {
  const { t } = useTranslation();

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [severity, setSeverity] = React.useState<NotificationSeverity>(
    NOTIFICATION_SEVERITIES.INFO,
  );
  const [audienceKind, setAudienceKind] = React.useState<BroadcastAudienceKind>(
    BROADCAST_AUDIENCE_KINDS.ALL,
  );
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [link, setLink] = React.useState("");
  const [roleSearch, setRoleSearch] = React.useState("");
  const [userSearch, setUserSearch] = React.useState("");

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<{
    message: string;
    canSafeRetry: boolean;
  } | null>(null);
  const [showValidation, setShowValidation] = React.useState(false);

  const attemptRef = React.useRef<{ fingerprint: string; key: string } | null>(
    null,
  );

  const resetForm = React.useCallback(() => {
    setTitle("");
    setBody("");
    setSeverity(NOTIFICATION_SEVERITIES.INFO);
    setAudienceKind(BROADCAST_AUDIENCE_KINDS.ALL);
    setSelectedRoleIds([]);
    setSelectedUserIds([]);
    setLink("");
    setRoleSearch("");
    setUserSearch("");
    setConfirmOpen(false);
    setSubmitError(null);
    setShowValidation(false);
    attemptRef.current = null;
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const buildAudience = React.useCallback((): BroadcastAudience => {
    if (audienceKind === BROADCAST_AUDIENCE_KINDS.ROLES) {
      return { kind: "ROLES", roleIds: selectedRoleIds };
    }
    if (audienceKind === BROADCAST_AUDIENCE_KINDS.USERS) {
      return { kind: "USERS", userIds: selectedUserIds };
    }
    return { kind: "ALL" };
  }, [audienceKind, selectedRoleIds, selectedUserIds]);

  const roleNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const role of rolesState.items) {
      map.set(role.id, role.name);
    }
    return map;
  }, [rolesState.items]);

  const validationErrors = React.useMemo(() => {
    const errs: string[] = [];
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle) {
      errs.push(t("notifications.broadcast.validation.titleRequired"));
    } else if (trimmedTitle.length > BROADCAST_LIMITS.titleMax) {
      errs.push(
        t("notifications.broadcast.validation.titleTooLong", {
          max: BROADCAST_LIMITS.titleMax,
        }),
      );
    }

    if (!trimmedBody) {
      errs.push(t("notifications.broadcast.validation.bodyRequired"));
    } else if (trimmedBody.length > BROADCAST_LIMITS.bodyMax) {
      errs.push(
        t("notifications.broadcast.validation.bodyTooLong", {
          max: BROADCAST_LIMITS.bodyMax,
        }),
      );
    }

    if (!isValidBroadcastLink(link)) {
      errs.push(
        t("notifications.broadcast.validation.linkInvalid", {
          max: BROADCAST_LIMITS.linkMax,
        }),
      );
    }

    if (
      audienceKind === BROADCAST_AUDIENCE_KINDS.ROLES &&
      selectedRoleIds.length === 0
    ) {
      errs.push(t("notifications.broadcast.validation.rolesRequired"));
    }

    if (audienceKind === BROADCAST_AUDIENCE_KINDS.USERS) {
      if (selectedUserIds.length === 0) {
        errs.push(t("notifications.broadcast.validation.usersRequired"));
      } else if (selectedUserIds.length > BROADCAST_LIMITS.maxExplicitUsers) {
        errs.push(
          t("notifications.broadcast.validation.usersTooMany", {
            max: BROADCAST_LIMITS.maxExplicitUsers,
          }),
        );
      }
    }

    return errs;
  }, [
    audienceKind,
    body,
    link,
    selectedRoleIds.length,
    selectedUserIds.length,
    t,
    title,
  ]);

  const filteredRoles = React.useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return rolesState.items;
    return rolesState.items.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        role.code.toLowerCase().includes(q),
    );
  }, [roleSearch, rolesState.items]);

  const filteredMembers = React.useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return membersState.items;
    return membersState.items.filter(
      (member) =>
        member.displayName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q),
    );
  }, [membersState.items, userSearch]);

  const toggleRole = (roleId: string) => {
    setSubmitError(null);
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const toggleUser = (userId: string) => {
    setSubmitError(null);
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleReviewClick = (event: React.FormEvent) => {
    event.preventDefault();
    setShowValidation(true);
    setSubmitError(null);
    if (validationErrors.length > 0) return;
    setConfirmOpen(true);
  };

  const executeSubmit = async () => {
    const payload: CreateBroadcastPayload = {
      title: title.trim(),
      body: body.trim(),
      severity,
      audience: buildAudience(),
      link: link.trim() || null,
    };

    const fingerprint = buildBroadcastPayloadFingerprint(payload);
    if (!attemptRef.current || attemptRef.current.fingerprint !== fingerprint) {
      attemptRef.current = {
        fingerprint,
        key: crypto.randomUUID(),
      };
    }

    const idempotencyKey = attemptRef.current.key;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createBroadcastApi(payload, {
        idempotencyKey,
        correlationId: crypto.randomUUID(),
      });

      attemptRef.current = null;
      setConfirmOpen(false);
      toast.success(t("notifications.broadcast.composer.queuedSuccess"));
      onCreated(result);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      setConfirmOpen(false);
      if (isApiError(error)) {
        if (error.status === 403) {
          setSubmitError({
            message: t("notifications.broadcast.errors.forbidden"),
            canSafeRetry: false,
          });
        } else if (error.status === 409) {
          attemptRef.current = null;
          setSubmitError({
            message: t("notifications.broadcast.errors.conflict"),
            canSafeRetry: false,
          });
        } else if (error.status === 422) {
          setSubmitError({
            message: t("notifications.broadcast.errors.invalidAudience"),
            canSafeRetry: false,
          });
        } else if (error.status === 400) {
          setSubmitError({
            message: t("notifications.broadcast.errors.validation"),
            canSafeRetry: false,
          });
        } else if (
          error.status === 0 ||
          error.code === "TIMEOUT" ||
          error.code === "NETWORK_ERROR" ||
          error.status >= 500
        ) {
          setSubmitError({
            message: t("notifications.broadcast.errors.uncertainOutcome"),
            canSafeRetry: true,
          });
        } else {
          setSubmitError({
            message: t("notifications.broadcast.errors.generic"),
            canSafeRetry: false,
          });
        }
      } else {
        setSubmitError({
          message: t("notifications.broadcast.errors.uncertainOutcome"),
          canSafeRetry: true,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityOptionStyle = (value: NotificationSeverity, active: boolean) => {
    if (!active) {
      return "border-border bg-card hover:bg-muted/50 text-foreground";
    }
    if (value === NOTIFICATION_SEVERITIES.CRITICAL) {
      return "border-destructive bg-destructive/10 text-destructive ring-1 ring-destructive/30";
    }
    if (value === NOTIFICATION_SEVERITIES.WARNING) {
      return "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30";
    }
    return "border-primary bg-primary/10 text-primary ring-1 ring-primary/30";
  };

  const previewSeverityStyle =
    severity === NOTIFICATION_SEVERITIES.CRITICAL
      ? "text-destructive bg-destructive/10"
      : severity === NOTIFICATION_SEVERITIES.WARNING
        ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
        : "text-primary bg-primary/10";

  const trimmedLink = link.trim();
  const linkValid = isValidBroadcastLink(link);
  const audienceSummary = formatBroadcastAudienceSummary(
    buildAudience(),
    t,
    roleNameMap,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl sm:max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Megaphone className="size-4 text-primary" aria-hidden="true" />
              <span>{t("notifications.broadcast.composer.title")}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t("notifications.broadcast.composer.description")}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleReviewClick}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>
                    {t("notifications.broadcast.errors.generic")}
                  </AlertTitle>
                  <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>{submitError.message}</span>
                    {submitError.canSafeRetry && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => void executeSubmit()}
                        className="shrink-0"
                      >
                        <RefreshCw className="size-3.5 mr-1.5" />
                        {t("notifications.broadcast.errors.retrySubmit")}
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {showValidation && validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      {validationErrors.map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="broadcast-title">
                    {t("notifications.broadcast.composer.titleLabel")} *
                  </Label>
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      title.trim().length > BROADCAST_LIMITS.titleMax
                        ? "text-destructive font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {title.trim().length}/{BROADCAST_LIMITS.titleMax}
                  </span>
                </div>
                <Input
                  id="broadcast-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder={t(
                    "notifications.broadcast.composer.titlePlaceholder",
                  )}
                  maxLength={BROADCAST_LIMITS.titleMax + 20}
                  disabled={isSubmitting}
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="broadcast-body">
                    {t("notifications.broadcast.composer.bodyLabel")} *
                  </Label>
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      body.trim().length > BROADCAST_LIMITS.bodyMax
                        ? "text-destructive font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {body.trim().length}/{BROADCAST_LIMITS.bodyMax}
                  </span>
                </div>
                <Textarea
                  id="broadcast-body"
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder={t(
                    "notifications.broadcast.composer.bodyPlaceholder",
                  )}
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <Label>
                  {t("notifications.broadcast.composer.severityLabel")}
                </Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      {
                        value: NOTIFICATION_SEVERITIES.INFO,
                        Icon: Info,
                      },
                      {
                        value: NOTIFICATION_SEVERITIES.WARNING,
                        Icon: AlertTriangle,
                      },
                      {
                        value: NOTIFICATION_SEVERITIES.CRITICAL,
                        Icon: ShieldAlert,
                      },
                    ] as const
                  ).map(({ value, Icon }) => {
                    const active = severity === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setSeverity(value);
                          setSubmitError(null);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer",
                          severityOptionStyle(value, active),
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1">
                          {t(`notifications.broadcast.severities.${value}`)}
                        </span>
                        {active && (
                          <Check className="size-3.5 shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audience */}
              <div className="space-y-2.5">
                <Label>
                  {t("notifications.broadcast.composer.audienceLabel")}
                </Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      {
                        kind: BROADCAST_AUDIENCE_KINDS.ALL,
                        title: t("notifications.broadcast.audience.ALL"),
                        desc: t("notifications.broadcast.audience.allDesc"),
                      },
                      {
                        kind: BROADCAST_AUDIENCE_KINDS.ROLES,
                        title: t("notifications.broadcast.audience.ROLES"),
                        desc: t("notifications.broadcast.audience.rolesDesc"),
                      },
                      {
                        kind: BROADCAST_AUDIENCE_KINDS.USERS,
                        title: t("notifications.broadcast.audience.USERS"),
                        desc: t("notifications.broadcast.audience.usersDesc"),
                      },
                    ] as const
                  ).map((option) => {
                    const active = audienceKind === option.kind;
                    return (
                      <button
                        key={option.kind}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setAudienceKind(option.kind);
                          setSubmitError(null);
                        }}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors cursor-pointer",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-card hover:bg-muted/40",
                        )}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {option.title}
                          </span>
                          {active && (
                            <Check
                              className="size-3.5 text-primary shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <span className="text-[11px] leading-snug text-muted-foreground">
                          {option.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Role Multi-select */}
                {audienceKind === BROADCAST_AUDIENCE_KINDS.ROLES && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="relative flex-1 min-w-48">
                        <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <Input
                          value={roleSearch}
                          onChange={(e) => setRoleSearch(e.target.value)}
                          placeholder={t(
                            "notifications.broadcast.composer.rolesSearchPlaceholder",
                          )}
                          className="h-8 pl-8 text-xs"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[11px]">
                          {t("notifications.broadcast.composer.selectedCount", {
                            count: selectedRoleIds.length,
                          })}
                        </Badge>
                        {selectedRoleIds.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRoleIds([])}
                            className="h-7 px-2 text-[11px]"
                          >
                            {t(
                              "notifications.broadcast.composer.clearSelection",
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {rolesState.isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        <span>
                          {t(
                            "notifications.broadcast.composer.loadingDirectory",
                          )}
                        </span>
                      </div>
                    ) : rolesState.forbidden ? (
                      <p className="py-3 text-xs text-amber-600 dark:text-amber-400">
                        {t(
                          "notifications.broadcast.composer.directoryForbidden",
                        )}
                      </p>
                    ) : rolesState.error ? (
                      <div className="flex items-center justify-between gap-2 py-3 text-xs text-destructive">
                        <span>
                          {t("notifications.broadcast.composer.directoryError")}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={rolesState.onRetry}
                          className="h-7 text-xs"
                        >
                          {t("notifications.broadcast.composer.retryDirectory")}
                        </Button>
                      </div>
                    ) : rolesState.items.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {t("notifications.broadcast.composer.noRoles")}
                      </p>
                    ) : filteredRoles.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {t("notifications.broadcast.composer.noMatches")}
                      </p>
                    ) : (
                      <ScrollArea className="h-44 pr-2">
                        <div className="space-y-1">
                          {filteredRoles.map((role) => {
                            const checked = selectedRoleIds.includes(role.id);
                            return (
                              <label
                                key={role.id}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs cursor-pointer transition-colors",
                                  checked
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/60",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleRole(role.id)}
                                  disabled={isSubmitting}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {role.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                                    {role.code}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0"
                                >
                                  <Users className="size-3 mr-1" />
                                  {role.memberCount}
                                </Badge>
                              </label>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}

                {/* User Multi-select */}
                {audienceKind === BROADCAST_AUDIENCE_KINDS.USERS && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="relative flex-1 min-w-48">
                        <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <Input
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder={t(
                            "notifications.broadcast.composer.usersSearchPlaceholder",
                          )}
                          className="h-8 pl-8 text-xs"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[11px]">
                          {t("notifications.broadcast.composer.selectedCount", {
                            count: selectedUserIds.length,
                          })}
                        </Badge>
                        {selectedUserIds.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUserIds([])}
                            className="h-7 px-2 text-[11px]"
                          >
                            {t(
                              "notifications.broadcast.composer.clearSelection",
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {membersState.isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        <span>
                          {t(
                            "notifications.broadcast.composer.loadingDirectory",
                          )}
                        </span>
                      </div>
                    ) : membersState.forbidden ? (
                      <p className="py-3 text-xs text-amber-600 dark:text-amber-400">
                        {t(
                          "notifications.broadcast.composer.directoryForbidden",
                        )}
                      </p>
                    ) : membersState.error ? (
                      <div className="flex items-center justify-between gap-2 py-3 text-xs text-destructive">
                        <span>
                          {t("notifications.broadcast.composer.directoryError")}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={membersState.onRetry}
                          className="h-7 text-xs"
                        >
                          {t("notifications.broadcast.composer.retryDirectory")}
                        </Button>
                      </div>
                    ) : membersState.items.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {t("notifications.broadcast.composer.noUsers")}
                      </p>
                    ) : filteredMembers.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {t("notifications.broadcast.composer.noMatches")}
                      </p>
                    ) : (
                      <ScrollArea className="h-44 pr-2">
                        <div className="space-y-1">
                          {filteredMembers.map((member) => {
                            const checked = selectedUserIds.includes(
                              member.userId,
                            );
                            return (
                              <label
                                key={member.userId}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs cursor-pointer transition-colors",
                                  checked
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/60",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() =>
                                    toggleUser(member.userId)
                                  }
                                  disabled={isSubmitting}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {member.displayName}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {member.email}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0"
                                >
                                  {member.role}
                                </Badge>
                              </label>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Internal Link */}
              <div className="space-y-1.5">
                <Label htmlFor="broadcast-link" className="flex items-center gap-1.5">
                  <Link2 className="size-3.5 text-muted-foreground" />
                  <span>{t("notifications.broadcast.composer.linkLabel")}</span>
                </Label>
                <Input
                  id="broadcast-link"
                  value={link}
                  onChange={(e) => {
                    setLink(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder={t(
                    "notifications.broadcast.composer.linkPlaceholder",
                  )}
                  className={cn(!linkValid && "border-destructive")}
                  disabled={isSubmitting}
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {t("notifications.broadcast.composer.linkPresets")}
                  </span>
                  {BROADCAST_LINK_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setLink(preset);
                        setSubmitError(null);
                      }}
                      className={cn(
                        "rounded border px-2 py-0.5 text-[11px] font-mono transition-colors cursor-pointer",
                        trimmedLink === preset
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("notifications.broadcast.composer.linkHint")}
                </p>
              </div>

              {/* Live Preview */}
              <div className="space-y-2">
                <Label>{t("notifications.broadcast.composer.previewTitle")}</Label>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-start gap-3 rounded-md border border-border/60 bg-card p-3 shadow-xs">
                    <div
                      className={cn(
                        "mt-0.5 rounded-md p-1.5 shrink-0",
                        previewSeverityStyle,
                      )}
                    >
                      <Megaphone className="size-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">
                          {title.trim() ||
                            t(
                              "notifications.broadcast.composer.previewEmptyTitle",
                            )}
                        </p>
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {body.trim() ||
                          t(
                            "notifications.broadcast.composer.previewEmptyBody",
                          )}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="text-[10px] text-muted-foreground/80 font-medium">
                          {t("notifications.broadcast.composer.previewNow")}
                        </span>
                        {trimmedLink && linkValid && (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                            {trimmedLink}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-border bg-muted/10 px-6 py-3.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("notifications.broadcast.composer.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    {t("notifications.broadcast.composer.submitting")}
                  </>
                ) : (
                  <>
                    <Send className="size-4 mr-2" />
                    {t("notifications.broadcast.composer.submit")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("notifications.broadcast.confirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("notifications.broadcast.confirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2.5 text-xs">
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              <p className="font-semibold text-foreground line-clamp-2">
                {title.trim()}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                <span>
                  {t("notifications.broadcast.confirm.targetLabel")}:{" "}
                  <strong className="text-foreground">{audienceSummary}</strong>
                </span>
                <span>
                  {t("notifications.broadcast.confirm.severityLabel")}:{" "}
                  <strong className="text-foreground">
                    {t(`notifications.broadcast.severities.${severity}`)}
                  </strong>
                </span>
              </div>
            </div>

            {audienceKind === BROADCAST_AUDIENCE_KINDS.ALL && (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription className="text-xs">
                  {t("notifications.broadcast.confirm.allWarning")}
                </AlertDescription>
              </Alert>
            )}

            {severity === NOTIFICATION_SEVERITIES.CRITICAL && (
              <Alert variant="destructive">
                <ShieldAlert className="size-4" />
                <AlertDescription className="text-xs">
                  {t("notifications.broadcast.confirm.criticalWarning")}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              {t("notifications.broadcast.confirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void executeSubmit();
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  {t("notifications.broadcast.composer.submitting")}
                </>
              ) : (
                t("notifications.broadcast.confirm.confirmSend")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
