"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Settings, Loader2, Star, Building2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";

interface OrgSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string;
}

interface TenantData {
  id: string;
  code: string;
  name: string;
  logoUrl?: string | null;
}

function OrgSettingsForm({
  targetTenant,
  targetTenantId,
  isDefaultTenant,
  onClose,
}: {
  targetTenant: TenantData;
  targetTenantId: string;
  isDefaultTenant: boolean;
  onClose: () => void;
}) {
  const { updateOrganization, setDefaultTenant } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState(targetTenant.name || "");
  const [logoUrl, setLogoUrl] = useState(targetTenant.logoUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError(t("tenant.orgNameLabel"));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await updateOrganization(targetTenantId, {
        name: trimmedName,
        logoUrl: logoUrl.trim() || undefined,
      });

      toast.success(t("tenant.saveSuccess"));
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("tenant.saveError");
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async () => {
    if (isDefaultTenant) return;

    try {
      setIsSettingDefault(true);
      await setDefaultTenant(targetTenantId);
      toast.success(t("tenant.setDefaultSuccess"));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("tenant.setDefaultError");
      toast.error(msg);
    } finally {
      setIsSettingDefault(false);
    }
  };

  return (
    <Tabs defaultValue="general" className="w-full mt-1">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="general" className="text-xs">
          <Building2 className="mr-1.5 size-3.5" />
          {t("tenant.tabGeneral")}
        </TabsTrigger>
        <TabsTrigger value="default" className="text-xs">
          <Star className="mr-1.5 size-3.5" />
          {t("tenant.tabDefault")}
        </TabsTrigger>
      </TabsList>

      {/* General Information Tab */}
      <TabsContent value="general" className="space-y-4 pt-3">
        <form onSubmit={handleSaveGeneral} className="space-y-3.5">
          {error && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="settings-name"
              className="text-xs font-medium text-foreground"
            >
              {t("tenant.orgNameLabel")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              required
              minLength={2}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="settings-code"
              className="text-xs font-medium text-foreground"
            >
              {t("tenant.orgCodeReadonly")}
            </label>
            <Input
              id="settings-code"
              value={targetTenant.code}
              disabled
              className="bg-muted cursor-not-allowed opacity-80"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="settings-logo"
              className="text-xs font-medium text-foreground"
            >
              {t("tenant.orgLogoLabel")}
            </label>
            <Input
              id="settings-logo"
              placeholder={t("tenant.orgLogoPlaceholder")}
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  {t("tenant.saving")}
                </>
              ) : (
                t("tenant.saveSettings")
              )}
            </Button>
          </div>
        </form>
      </TabsContent>

      {/* Default Organization Tab */}
      <TabsContent value="default" className="space-y-4 pt-3">
        <div className="rounded-lg border border-border p-4 bg-muted/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              {t("tenant.tabDefault")}
            </span>
            {isDefaultTenant ? (
              <Badge variant="default" className="gap-1 text-[10px]">
                <Check className="size-3" />
                {t("tenant.defaultBadge")}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                {targetTenant.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isDefaultTenant
              ? t("tenant.isCurrentlyDefault")
              : t("tenant.notDefaultHint")}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant={isDefaultTenant ? "outline" : "default"}
            onClick={handleSetDefault}
            disabled={isSettingDefault || isDefaultTenant}
          >
            {isSettingDefault ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                {t("tenant.saving")}
              </>
            ) : isDefaultTenant ? (
              <>
                <Check className="mr-1.5 size-3.5 text-primary" />
                {t("tenant.defaultBadge")}
              </>
            ) : (
              t("tenant.setDefault")
            )}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function OrgSettingsDialog({
  open,
  onOpenChange,
  tenantId,
}: OrgSettingsDialogProps) {
  const { activeTenant, tenants } = useAuth();
  const { t } = useTranslation();

  const targetTenantId = tenantId || activeTenant?.id;
  const targetTenant =
    tenants.find((t) => t.id === targetTenantId) ||
    (activeTenant?.id === targetTenantId ? activeTenant : null);

  const isDefaultTenant = tenants.some(
    (t) => t.id === targetTenantId && t.isDefault
  );

  if (!targetTenantId || !targetTenant) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              {t("tenant.settingsTitle")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("tenant.settingsDesc")} —{" "}
            <span className="font-medium text-foreground">
              {targetTenant.name}
            </span>
          </DialogDescription>
        </DialogHeader>

        {open && (
          <OrgSettingsForm
            key={targetTenant.id}
            targetTenant={targetTenant}
            targetTenantId={targetTenantId}
            isDefaultTenant={isDefaultTenant}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
