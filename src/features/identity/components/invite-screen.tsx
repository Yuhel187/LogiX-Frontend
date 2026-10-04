"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  User,
  Shield,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import {
  getPublicInvitationPreviewApi,
  acceptPublicInvitationApi,
} from "../api/invitations.api";
import { setStoredAccessToken } from "../api/auth.api";
import type { InvitationPreview } from "../schemas/invitation.schema";

export function InviteScreenContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states for new accounts
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorMessage(t("iam.invitations.publicPage.expiredError"));
      return;
    }

    let isMounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const data = await getPublicInvitationPreviewApi(token);
        if (isMounted) {
          setPreview(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || t("iam.invitations.publicPage.expiredError"));
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
  }, [token, t]);

  const isNewUser = Boolean(
    preview?.requiresRegistration ??
      (preview?.userExists !== undefined ? !preview.userExists : false)
  );

  const handleAccept = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;

    if (isNewUser) {
      const errors: Record<string, string> = {};
      if (!displayName.trim() || displayName.trim().length < 2) {
        errors.displayName =
          t("iam.invitations.publicPage.displayNameMinError") ||
          "Họ tên phải có ít nhất 2 ký tự";
      }
      if (!password || password.length < 8) {
        errors.password =
          t("iam.invitations.publicPage.passwordMinError") ||
          "Mật khẩu phải có ít nhất 8 ký tự";
      }
      if (!confirmPassword) {
        errors.confirmPassword =
          t("iam.invitations.publicPage.confirmPasswordRequiredError") ||
          "Vui lòng xác nhận lại mật khẩu";
      } else if (password !== confirmPassword) {
        errors.confirmPassword =
          t("iam.invitations.publicPage.passwordMismatchError") ||
          "Mật khẩu xác nhận không khớp";
      }
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await acceptPublicInvitationApi(token, {
        displayName: displayName.trim() || undefined,
        password: password || undefined,
      });

      setStoredAccessToken(res.accessToken);
      toast.success(
        t("iam.invitations.publicPage.successMessage", {
          tenantName: preview?.tenant.name || "tổ chức",
        })
      );

      // Chuyển hướng sang trang chính sau khi lưu token
      setTimeout(() => {
        window.location.href = "/";
      }, 600);
    } catch (err: any) {
      toast.error(err.message || "Chấp nhận lời mời thất bại");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/20 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center pb-1">
          <Image
            src="/logo_logix.png"
            alt="LogiX Logo"
            width={180}
            height={180}
            priority
            style={{ width: "auto" }}
            className="h-24 sm:h-28 max-w-56 object-contain drop-shadow-md"
          />
        </div>

        {/* Loading State */}
        {isLoading ? (
          <Card className="p-8 text-center shadow-lg border-border/70 backdrop-blur-md">
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                {t("iam.invitations.publicPage.verifying")}
              </p>
            </div>
          </Card>
        ) : errorMessage ? (
          // Error State
          <Card className="shadow-lg border-destructive/30 backdrop-blur-md">
            <CardHeader className="text-center pb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-8 ring-destructive/5 mx-auto mb-2">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                {t("iam.invitations.publicPage.unavailableTitle")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                {errorMessage}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-4">
              <Button asChild className="w-full" variant="outline">
                <Link href="/login">{t("iam.invitations.publicPage.backToLogin")}</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : preview ? (
          // Valid Invitation Card
          <Card className="shadow-xl border-border/80 overflow-hidden">
            <CardHeader className="text-center pb-4 bg-muted/20 border-b border-border/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-2">
                <Building2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                {t("iam.invitations.publicPage.title")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("iam.invitations.publicPage.subtitle", {
                  tenantName: preview.tenant.name,
                })}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              {/* Organization and Inviter Info */}
              <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("iam.invitations.publicPage.organizationLabel")}:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {preview.tenant.name}
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {preview.tenant.code}
                    </Badge>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("iam.invitations.publicPage.invitedBy")}:
                  </span>
                  <span className="text-foreground font-medium flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {preview.inviter.displayName || preview.inviter.email}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("iam.invitations.emailLabel")}:</span>
                  <span className="text-foreground font-mono">{preview.email}</span>
                </div>
              </div>

              {/* Roles to be assumed */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {t("iam.invitations.publicPage.assignedRoles")}:
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {preview.roles.map((r) => (
                    <Badge
                      key={r.id}
                      variant="secondary"
                      className="text-xs py-1 px-2.5 flex items-center gap-1"
                    >
                      <Shield className="h-3 w-3 text-primary" />
                      {r.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* New Registration Form if user doesn't exist */}
              {isNewUser && (
                <div className="space-y-3 pt-3 border-t border-border/60">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-foreground">
                      {t("iam.invitations.publicPage.newAccountTitle")}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {t("iam.invitations.publicPage.newAccountDesc")}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="display-name" className="text-xs">
                      {t("iam.invitations.publicPage.displayNameLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        if (formErrors.displayName) {
                          setFormErrors((prev) => ({ ...prev, displayName: "" }));
                        }
                      }}
                      placeholder={t("iam.invitations.publicPage.displayNamePlaceholder")}
                      disabled={isSubmitting}
                      className={`h-9 ${formErrors.displayName ? "border-destructive" : ""}`}
                    />
                    {formErrors.displayName && (
                      <p className="text-[11px] text-destructive">
                        {formErrors.displayName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs">
                      {t("iam.invitations.publicPage.passwordLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPassword(val);
                          if (formErrors.password) {
                            setFormErrors((prev) => ({ ...prev, password: "" }));
                          }
                          if (formErrors.confirmPassword && confirmPassword && val === confirmPassword) {
                            setFormErrors((prev) => ({ ...prev, confirmPassword: "" }));
                          }
                        }}
                        placeholder={t("iam.invitations.publicPage.passwordPlaceholder")}
                        disabled={isSubmitting}
                        className={`h-9 pl-9 pr-9 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${formErrors.password ? "border-destructive" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        tabIndex={-1}
                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="text-[11px] text-destructive">
                        {formErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs">
                      {t("iam.invitations.publicPage.confirmPasswordLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (formErrors.confirmPassword) {
                            setFormErrors((prev) => ({ ...prev, confirmPassword: "" }));
                          }
                        }}
                        placeholder={t("iam.invitations.publicPage.confirmPasswordPlaceholder")}
                        disabled={isSubmitting}
                        className={`h-9 pl-9 pr-9 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${formErrors.confirmPassword ? "border-destructive" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        tabIndex={-1}
                        title={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.confirmPassword && (
                      <p className="text-[11px] text-destructive">
                        {formErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2 pb-6 px-6">
              <Button
                onClick={() => handleAccept()}
                disabled={isSubmitting}
                className="w-full gap-2 text-sm font-semibold h-10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("iam.invitations.publicPage.accepting")}
                  </>
                ) : (
                  <>
                    {t("iam.invitations.publicPage.acceptButton")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

export function InviteScreen() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <InviteScreenContent />
    </React.Suspense>
  );
}
