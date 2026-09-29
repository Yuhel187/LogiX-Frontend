"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2, Lock, Eye, EyeOff, Check, X, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function SecurityTab() {
  const { t } = useTranslation();
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = React.useState<string>("");
  const [newPassword, setNewPassword] = React.useState<string>("");
  const [confirmPassword, setConfirmPassword] = React.useState<string>("");
  const [revokeOtherSessions, setRevokeOtherSessions] = React.useState<boolean>(true);

  const [showCurrentPassword, setShowCurrentPassword] = React.useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = React.useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState<boolean>(false);

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Password criteria checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const calculateStrength = (): { score: number; label: string; color: string } => {
    if (!newPassword) return { score: 0, label: "", color: "bg-muted" };
    let passedCount = 0;
    if (hasMinLength) passedCount++;
    if (hasUppercase) passedCount++;
    if (hasNumber) passedCount++;
    if (hasSpecial) passedCount++;

    if (passedCount <= 1) {
      return { score: 25, label: t("account.security.strengthVeryWeak"), color: "bg-destructive" };
    }
    if (passedCount === 2) {
      return { score: 50, label: t("account.security.strengthWeak"), color: "bg-amber-500" };
    }
    if (passedCount === 3) {
      return { score: 75, label: t("account.security.strengthMedium"), color: "bg-blue-500" };
    }
    return { score: 100, label: t("account.security.strengthStrong"), color: "bg-emerald-500" };
  };

  const strength = calculateStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage(t("account.security.currentPasswordPlaceholder"));
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setErrorMessage(t("account.security.passwordRequirementsError"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("account.security.passwordMismatchError"));
      return;
    }

    try {
      setIsLoading(true);
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
        revokeOtherSessions,
      });

      // Clear inputs
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (res.revokedOthersCount && res.revokedOthersCount > 0) {
        setSuccessMessage(t("account.security.successWithRevoked", { count: res.revokedOthersCount }));
      } else {
        setSuccessMessage(t("account.security.success"));
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "";
      if (rawMsg.includes("Mật khẩu hiện tại không chính xác") || rawMsg.toLowerCase().includes("current password")) {
        setErrorMessage(t("account.security.invalidCurrentPassword"));
      } else if (rawMsg.includes("Mật khẩu mới không được trùng") || rawMsg.toLowerCase().includes("same as current")) {
        setErrorMessage(t("account.security.samePasswordError"));
      } else {
        setErrorMessage(rawMsg || t("account.security.changePasswordFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border/80 shadow-sm bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            {t("account.security.title")}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {t("account.security.desc")}
          </CardDescription>
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

            <div className="space-y-5 max-w-xl">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="size-3.5 text-muted-foreground" />
                  <span>{t("account.security.currentPassword")}</span>
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t("account.security.currentPasswordPlaceholder")}
                    required
                    className="h-11 pr-10 rounded-xl bg-background/80 border-input/80 focus-visible:ring-1 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="size-3.5 text-muted-foreground" />
                  <span>{t("account.security.newPassword")}</span>
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("account.security.newPasswordPlaceholder")}
                    required
                    className="h-11 pr-10 rounded-xl bg-background/80 border-input/80 focus-visible:ring-1 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="space-y-2 pt-1 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("account.security.strengthLabel")}:</span>
                      <span className="font-semibold text-foreground">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-300", strength.color)}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                    {/* Criteria checklist */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {hasMinLength ? <Check className="size-3.5 text-emerald-500" /> : <X className="size-3.5 text-muted-foreground/60" />}
                        <span className={cn(hasMinLength && "text-foreground font-medium")}>
                          {t("account.security.criteriaMinLength")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasUppercase ? <Check className="size-3.5 text-emerald-500" /> : <X className="size-3.5 text-muted-foreground/60" />}
                        <span className={cn(hasUppercase && "text-foreground font-medium")}>
                          {t("account.security.criteriaUppercase")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasNumber ? <Check className="size-3.5 text-emerald-500" /> : <X className="size-3.5 text-muted-foreground/60" />}
                        <span className={cn(hasNumber && "text-foreground font-medium")}>
                          {t("account.security.criteriaNumber")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasSpecial ? <Check className="size-3.5 text-emerald-500" /> : <X className="size-3.5 text-muted-foreground/60" />}
                        <span className={cn(hasSpecial && "text-foreground font-medium")}>
                          {t("account.security.criteriaSpecial")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="size-3.5 text-muted-foreground" />
                  <span>{t("account.security.confirmPassword")}</span>
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("account.security.confirmPasswordPlaceholder")}
                    required
                    className="h-11 pr-10 rounded-xl bg-background/80 border-input/80 focus-visible:ring-1 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Revoke Other Sessions Checkbox */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <Checkbox
                  id="revokeOtherSessions"
                  checked={revokeOtherSessions}
                  onCheckedChange={(checked) => setRevokeOtherSessions(Boolean(checked))}
                  className="mt-0.5 rounded-md"
                />
                <div className="space-y-0.5">
                  <Label
                    htmlFor="revokeOtherSessions"
                    className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldAlert className="size-3.5 text-amber-500 shrink-0" />
                    <span>{t("account.security.revokeOthersCheckbox")}</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {t("account.security.revokeOthersHint")}
                  </p>
                </div>
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
                    <span>{t("account.security.changing")}</span>
                  </>
                ) : (
                  <span>{t("account.security.changePasswordButton")}</span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
