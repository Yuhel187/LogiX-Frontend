"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Undo2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import {
  getTenantAiInstructionsApi,
  resetTenantAiInstructionsApi,
  updateTenantAiInstructionsApi,
} from "../../api/auth.api";
import {
  IAM_PERMISSIONS,
  MAX_TENANT_AI_INSTRUCTIONS_LENGTH,
  updateTenantAiInstructionsSchema,
  type TenantAiInstructionsView,
} from "../../schemas/auth.schema";
import {
  formatIdentityError,
  getIdentityErrorKey,
} from "../../utils/error-formatter";

const PRESET_KEYS = [
  {
    id: "warehouse",
    labelKey: "tenant.aiInstructionsPresetWarehouseLabel",
    textKey: "tenant.aiInstructionsPresetWarehouseText",
  },
  {
    id: "tone",
    labelKey: "tenant.aiInstructionsPresetToneLabel",
    textKey: "tenant.aiInstructionsPresetToneText",
  },
  {
    id: "dispatch",
    labelKey: "tenant.aiInstructionsPresetDispatchLabel",
    textKey: "tenant.aiInstructionsPresetDispatchText",
  },
] as const;

export function canManageTenantAiInstructions(params: {
  isSuperAdmin: boolean;
  isOwner: boolean;
  hasPermission: (permission: string) => boolean;
}): boolean {
  return (
    params.isSuperAdmin ||
    params.isOwner ||
    params.hasPermission(IAM_PERMISSIONS.AI_INSTRUCTIONS_MANAGE)
  );
}

export function TenantAiInstructionsForm({ tenantId }: { tenantId: string }) {
  const { accessToken, isSuperAdmin, isOwner, hasPermission } = useAuth();
  const { t, locale } = useTranslation();

  const canManage = canManageTenantAiInstructions({
    isSuperAdmin,
    isOwner,
    hasPermission,
  });

  const [view, setView] = useState<TenantAiInstructionsView | null>(null);
  const [instructions, setInstructions] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getTenantAiInstructionsApi(tenantId, accessToken ?? undefined)
      .then((data) => {
        if (cancelled) return;
        setLoadError(null);
        setView(data);
        setInstructions(data.customInstructions ?? "");
        setEnabled(data.enabled);
        setValidationError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          getIdentityErrorKey(err, "tenant.aiInstructionsLoadError"),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, accessToken, loadAttempt]);

  const savedText = view?.customInstructions ?? "";
  const savedEnabled = view?.enabled ?? true;
  const maxLength = view?.maxLength ?? MAX_TENANT_AI_INSTRUCTIONS_LENGTH;
  const isDirty =
    instructions.trim() !== savedText.trim() || enabled !== savedEnabled;

  const statusBadge = React.useMemo(() => {
    if (!view || view.isDefault) {
      return {
        label: t("tenant.aiInstructionsStatusDefault"),
        className:
          "bg-muted text-muted-foreground border-border/80",
      };
    }
    if (view.enabled) {
      return {
        label: t("tenant.aiInstructionsStatusActive"),
        className:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      };
    }
    return {
      label: t("tenant.aiInstructionsStatusPaused"),
      className:
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    };
  }, [view, t]);

  const updatedAtValue = view?.updatedAt ?? null;
  const formattedUpdatedAt = React.useMemo(() => {
    if (!updatedAtValue) return null;
    try {
      return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(updatedAtValue));
    } catch {
      return updatedAtValue;
    }
  }, [updatedAtValue, locale]);

  const handleApplyPreset = (presetTextKey: string) => {
    if (!canManage || isSaving) return;
    const presetText = t(presetTextKey);
    setInstructions((prev) => {
      const trimmed = prev.trim();
      const next = trimmed ? `${trimmed}\n${presetText}` : presetText;
      return next.slice(0, maxLength);
    });
    setValidationError(null);
  };

  const handleRevert = () => {
    setInstructions(savedText);
    setEnabled(savedEnabled);
    setValidationError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || isSaving) return;

    const trimmed = instructions.trim();
    const payload = {
      customInstructions: trimmed.length > 0 ? trimmed : null,
      enabled,
    };

    const parsed = updateTenantAiInstructionsSchema.safeParse(payload);
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ??
          "tenant.aiInstructionsMaxLengthError",
      );
      return;
    }

    try {
      setIsSaving(true);
      setValidationError(null);
      const updated = await updateTenantAiInstructionsApi(
        tenantId,
        parsed.data,
        accessToken ?? undefined,
      );
      setView(updated);
      setInstructions(updated.customInstructions ?? "");
      setEnabled(updated.enabled);
      toast.success(t("tenant.aiInstructionsSaveSuccess"));
    } catch (err: unknown) {
      toast.error(formatIdentityError(err, t, "tenant.aiInstructionsSaveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!canManage || isResetting) return;
    try {
      setIsResetting(true);
      const updated = await resetTenantAiInstructionsApi(
        tenantId,
        accessToken ?? undefined,
      );
      setView(updated);
      setInstructions(updated.customInstructions ?? "");
      setEnabled(updated.enabled);
      setValidationError(null);
      setIsResetDialogOpen(false);
      toast.success(t("tenant.aiInstructionsResetSuccess"));
    } catch (err: unknown) {
      toast.error(
        formatIdentityError(err, t, "tenant.aiInstructionsResetError"),
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="pt-6 border-t border-border/60 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {t("tenant.aiInstructionsTitle")}
            </h3>
            {!isLoading && !loadError && (
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${statusBadge.className}`}
              >
                {statusBadge.label}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("tenant.aiInstructionsDesc")}
          </p>
        </div>

        {!isLoading && !loadError && formattedUpdatedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Clock className="size-3.5 shrink-0" />
            <span>
              {view?.updatedBy
                ? t("tenant.aiInstructionsUpdatedBy", {
                    name: view.updatedBy.displayName,
                    time: formattedUpdatedAt,
                  })
                : t("tenant.aiInstructionsUpdatedAt", {
                    time: formattedUpdatedAt,
                  })}
            </span>
          </div>
        )}
      </div>

      {/* Loading / Error / Form */}
      {isLoading ? (
        <div className="flex items-center gap-2.5 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>{t("tenant.aiInstructionsLoading")}</span>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-destructive">{t(loadError)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              setLoadError(null);
              setLoadAttempt((n) => n + 1);
            }}
            className="rounded-lg shrink-0 cursor-pointer"
          >
            {t("tenant.aiInstructionsRetry")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5 w-full">
          {/* Enable/Disable Switch */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
            <div className="space-y-0.5 min-w-0">
              <label
                htmlFor="ai-instructions-enabled"
                className="text-sm font-semibold text-foreground cursor-pointer"
              >
                {t("tenant.aiInstructionsEnabledLabel")}
              </label>
              <p className="text-xs text-muted-foreground">
                {t("tenant.aiInstructionsEnabledHint")}
              </p>
            </div>
            <Switch
              id="ai-instructions-enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked)}
              disabled={!canManage || isSaving}
              aria-label={t("tenant.aiInstructionsEnabledLabel")}
            />
          </div>

          {/* Preset Chips */}
          {canManage && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("tenant.aiInstructionsPresetsLabel")}
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_KEYS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => handleApplyPreset(preset.textKey)}
                    className="h-8 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    + {t(preset.labelKey)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Textarea + Counter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="tenant-ai-instructions"
                className="text-sm font-semibold text-foreground"
              >
                {t("tenant.aiInstructionsFieldLabel")}
              </label>
              <span
                className={`text-xs font-medium tabular-nums ${
                  instructions.length > maxLength
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {instructions.length} / {maxLength}
              </span>
            </div>
            <Textarea
              id="tenant-ai-instructions"
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                setValidationError(null);
              }}
              placeholder={t("tenant.aiInstructionsPlaceholder")}
              disabled={!canManage || isSaving}
              maxLength={maxLength}
              rows={5}
              aria-invalid={!!validationError}
              className="rounded-xl bg-background border-border/80 text-sm leading-relaxed resize-y min-h-[120px]"
            />
            {validationError && (
              <p className="text-xs text-destructive">{t(validationError)}</p>
            )}
          </div>

          {/* Guardrails Notice */}
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 flex items-start gap-3">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("tenant.aiInstructionsGuardrailsNote")}
            </p>
          </div>

          {/* Actions / Read-only Notice */}
          {canManage ? (
            <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetDialogOpen(true)}
                  disabled={
                    isSaving || isResetting || (view?.isDefault && enabled)
                  }
                  className="h-10 px-4 rounded-xl text-sm font-semibold gap-2 cursor-pointer"
                >
                  <RotateCcw className="size-4" />
                  {t("tenant.aiInstructionsResetButton")}
                </Button>
                {isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRevert}
                    disabled={isSaving}
                    className="h-10 px-4 rounded-xl text-sm font-medium gap-2 cursor-pointer"
                  >
                    <Undo2 className="size-4" />
                    {t("tenant.aiInstructionsRevertButton")}
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSaving || !isDirty}
                className="h-10 px-5 rounded-xl text-sm font-semibold cursor-pointer shadow-xs min-w-36 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("tenant.saving")}
                  </>
                ) : (
                  t("tenant.aiInstructionsSaveButton")
                )}
              </Button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 min-h-10 py-2 px-4 rounded-xl bg-muted/50 text-muted-foreground border border-border text-xs sm:text-sm font-medium">
              <Lock className="size-4 shrink-0" />
              <span>{t("tenant.aiInstructionsReadonly")}</span>
            </div>
          )}
        </form>
      )}

      {/* Confirm Reset Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("tenant.aiInstructionsResetTitle")}</DialogTitle>
            <DialogDescription>
              {t("tenant.aiInstructionsResetDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResetDialogOpen(false)}
              disabled={isResetting}
              className="rounded-xl cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReset}
              disabled={isResetting}
              className="rounded-xl cursor-pointer"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("tenant.saving")}
                </>
              ) : (
                t("tenant.aiInstructionsResetConfirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
