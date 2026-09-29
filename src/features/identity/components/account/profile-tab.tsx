"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle2, AlertCircle, Loader2, Mail, Phone, User as UserIcon, Shield } from "lucide-react";
import { AvatarPickerDialog } from "./avatar-picker-dialog";
import type { AuthUser, ActiveTenant } from "@/features/identity/schemas/auth.schema";

interface ProfileFormInnerProps {
  user: AuthUser | null;
  activeTenant: ActiveTenant | null;
}

function ProfileFormInner({ user, activeTenant }: ProfileFormInnerProps) {
  const { t } = useTranslation();
  const { updateProfile, updateCurrentUser } = useAuth();

  const [displayName, setDisplayName] = React.useState<string>(user?.displayName || "");
  const [phoneNumber, setPhoneNumber] = React.useState<string>(user?.phoneNumber || "");
  const [avatarUrl, setAvatarUrl] = React.useState<string>(user?.avatarUrl || "");
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = React.useState<boolean>(false);

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (displayName.trim().length < 2) {
      setErrorMessage(t("account.profile.nameMinLengthError"));
      return;
    }

    try {
      setIsLoading(true);
      await updateProfile({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      // Update state in Header & App immediately
      updateCurrentUser({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });

      setSuccessMessage(t("account.profile.success"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("account.profile.updateFailed");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "LX";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Card className="rounded-2xl border-border/80 shadow-sm bg-card/60 backdrop-blur-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {t("account.profile.title")}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {t("account.profile.desc")}
            </CardDescription>
          </div>
          {activeTenant?.role && (
            <Badge variant="outline" className="w-fit flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
              <Shield className="size-3.5" />
              <span>{activeTenant.role}</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Alerts */}
          {successMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in">
              <CheckCircle2 className="size-4.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in">
              <AlertCircle className="size-4.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-2xl bg-muted/30 border border-border/60">
            <div className="relative group">
              <Avatar className="size-20 border-2 border-border/80 shadow-md transition-transform duration-200 group-hover:scale-105">
                <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(true)}
                aria-label={t("account.profile.changeAvatar")}
                className="absolute bottom-0 right-0 size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors cursor-pointer ring-2 ring-background"
              >
                <Camera className="size-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">
                  {t("account.profile.avatar")}
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAvatarPickerOpen(true)}
                  className="h-7 text-xs font-semibold px-2.5 rounded-lg hover:bg-muted"
                >
                  {t("account.profile.changeAvatar")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("account.profile.avatarHint")}
              </p>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <UserIcon className="size-3.5 text-muted-foreground" />
                <span>{t("account.profile.displayName")}</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("account.profile.displayNamePlaceholder")}
                required
                className="h-11 rounded-xl bg-background/80 border-input/80 focus-visible:ring-1"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted-foreground" />
                <span>{t("account.profile.phoneNumber")}</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t("account.profile.phonePlaceholder")}
                className="h-11 rounded-xl bg-background/80 border-input/80 focus-visible:ring-1"
              />
            </div>

            {/* Email Address (Readonly) */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                <span>{t("account.profile.email")}</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                readOnly
                className="h-11 rounded-xl bg-muted/60 text-muted-foreground border-border/60 cursor-not-allowed opacity-90"
              />
              <p className="text-xs text-muted-foreground/80">
                {t("account.profile.emailHint")}
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 px-6 rounded-xl font-semibold shadow-sm transition-all duration-200 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>{t("account.profile.saving")}</span>
                </>
              ) : (
                <span>{t("account.profile.saveButton")}</span>
              )}
            </Button>
          </div>
        </form>

        {/* Avatar Picker Modal */}
        <AvatarPickerDialog
          open={isAvatarPickerOpen}
          onOpenChange={setIsAvatarPickerOpen}
          currentAvatarUrl={avatarUrl}
          onSelectAvatar={(url) => setAvatarUrl(url)}
        />
      </CardContent>
    </Card>
  );
}

export function ProfileTab() {
  const { user, activeTenant } = useAuth();
  return (
    <ProfileFormInner
      key={user?.id || "user"}
      user={user}
      activeTenant={activeTenant}
    />
  );
}

