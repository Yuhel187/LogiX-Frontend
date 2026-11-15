"use client";

import * as React from "react";
import {
  Boxes,
  Check,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Mail,
  MessageSquarePlus,
  Route,
  ShieldCheck,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactLeadApi } from "@/features/admin/api/admin.api";
import {
  CONTACT_LEAD_MAX_COMPANY_LENGTH,
  CONTACT_LEAD_MAX_EMAIL_LENGTH,
  CONTACT_LEAD_MAX_NAME_LENGTH,
  CONTACT_LEAD_MAX_OTHER_DETAIL_LENGTH,
  CONTACT_LEAD_MAX_PHONE_LENGTH,
  createContactLeadSchema,
} from "@/features/admin/schemas/admin.schema";
import type { ContactNeedCategory } from "@/features/admin/types/admin.types";
import { ApiError } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NEED_CARDS: ReadonlyArray<{
  code: ContactNeedCategory;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
}> = [
  {
    code: "ORDER_FULFILLMENT",
    icon: ClipboardList,
    titleKey: "landing.demo.needs.ORDER_FULFILLMENT.title",
    descKey: "landing.demo.needs.ORDER_FULFILLMENT.desc",
  },
  {
    code: "INVENTORY_WAREHOUSE",
    icon: Boxes,
    titleKey: "landing.demo.needs.INVENTORY_WAREHOUSE.title",
    descKey: "landing.demo.needs.INVENTORY_WAREHOUSE.desc",
  },
  {
    code: "TRANSPORT_ROUTE",
    icon: Route,
    titleKey: "landing.demo.needs.TRANSPORT_ROUTE.title",
    descKey: "landing.demo.needs.TRANSPORT_ROUTE.desc",
  },
  {
    code: "DRIVER_DELIVERY",
    icon: Truck,
    titleKey: "landing.demo.needs.DRIVER_DELIVERY.title",
    descKey: "landing.demo.needs.DRIVER_DELIVERY.desc",
  },
  {
    code: "DEMAND_FORECAST",
    icon: TrendingUp,
    titleKey: "landing.demo.needs.DEMAND_FORECAST.title",
    descKey: "landing.demo.needs.DEMAND_FORECAST.desc",
  },
  {
    code: "ENTERPRISE_RBAC",
    icon: ShieldCheck,
    titleKey: "landing.demo.needs.ENTERPRISE_RBAC.title",
    descKey: "landing.demo.needs.ENTERPRISE_RBAC.desc",
  },
  {
    code: "OTHER",
    icon: MessageSquarePlus,
    titleKey: "landing.demo.needs.OTHER.title",
    descKey: "landing.demo.needs.OTHER.desc",
  },
];

const DIRECT_CONTACT_EMAILS = [
  "khainq205@gmail.com",
  "lb.quochuy187@gmail.com",
] as const;

type FieldErrors = Partial<
  Record<
    "fullName" | "email" | "phoneNumber" | "companyName" | "needs" | "otherNeedDetail",
    string
  >
>;

export function DemoRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [selectedNeeds, setSelectedNeeds] = React.useState<ContactNeedCategory[]>([
    "ORDER_FULFILLMENT",
  ]);
  const [otherNeedDetail, setOtherNeedDetail] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [submitErrorKey, setSubmitErrorKey] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const hasOtherSelected = selectedNeeds.includes("OTHER");

  const resetForm = React.useCallback(() => {
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setCompanyName("");
    setSelectedNeeds(["ORDER_FULFILLMENT"]);
    setOtherNeedDetail("");
    setFieldErrors({});
    setSubmitErrorKey(null);
    setSubmitting(false);
    setSubmitted(false);
  }, []);

  const toggleNeed = (code: ContactNeedCategory) => {
    setSelectedNeeds((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code],
    );
    setFieldErrors((prev) => ({
      ...prev,
      needs: undefined,
      ...(code === "OTHER" ? { otherNeedDetail: undefined } : {}),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitErrorKey(null);
    const parsed = createContactLeadSchema.safeParse({
      fullName,
      email,
      phoneNumber,
      companyName,
      needs: selectedNeeds,
      otherNeedDetail: hasOtherSelected ? otherNeedDetail : undefined,
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors | undefined;
        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await submitContactLeadApi(parsed.data);
      setSubmitted(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 429) {
        setSubmitErrorKey("landing.demo.errors.rateLimited");
      } else {
        setSubmitErrorKey("landing.demo.errors.submitFailed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 sm:p-8 text-card-foreground shadow-2xl gap-6">
        <DialogHeader className="space-y-2 text-left">
          <div>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5"
            >
              {t("landing.demo.badge")}
            </Badge>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("landing.demo.title")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {t("landing.demo.description")}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-6 rounded-xl border border-primary/25 bg-primary/[0.05] p-6 sm:p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-2 max-w-lg mx-auto">
              <h3 className="text-lg font-semibold text-foreground">
                {t("landing.demo.successTitle")}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("landing.demo.successDescription")}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="h-10 px-5 text-sm font-medium"
              >
                {t("landing.demo.submitAnotherBtn")}
              </Button>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 px-5 text-sm font-semibold"
              >
                {t("landing.demo.closeBtn")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {submitErrorKey ? (
              <Alert variant="destructive">
                <AlertDescription>{t(submitErrorKey)}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="demo-full-name" className="text-xs font-semibold">
                  {t("landing.demo.fullNameLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="demo-full-name"
                  value={fullName}
                  maxLength={CONTACT_LEAD_MAX_NAME_LENGTH}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    if (fieldErrors.fullName) {
                      setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  placeholder={t("landing.demo.fullNamePlaceholder")}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  className="h-10 bg-background"
                />
                {fieldErrors.fullName ? (
                  <p className="text-xs text-destructive">
                    {t(fieldErrors.fullName)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-email" className="text-xs font-semibold">
                  {t("landing.demo.emailLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="demo-email"
                  type="email"
                  value={email}
                  maxLength={CONTACT_LEAD_MAX_EMAIL_LENGTH}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder={t("landing.demo.emailPlaceholder")}
                  aria-invalid={Boolean(fieldErrors.email)}
                  className="h-10 bg-background"
                />
                {fieldErrors.email ? (
                  <p className="text-xs text-destructive">
                    {t(fieldErrors.email)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-company" className="text-xs font-semibold">
                  {t("landing.demo.companyLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="demo-company"
                  value={companyName}
                  maxLength={CONTACT_LEAD_MAX_COMPANY_LENGTH}
                  onChange={(event) => {
                    setCompanyName(event.target.value);
                    if (fieldErrors.companyName) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        companyName: undefined,
                      }));
                    }
                  }}
                  placeholder={t("landing.demo.companyPlaceholder")}
                  aria-invalid={Boolean(fieldErrors.companyName)}
                  className="h-10 bg-background"
                />
                {fieldErrors.companyName ? (
                  <p className="text-xs text-destructive">
                    {t(fieldErrors.companyName)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="demo-phone" className="text-xs font-semibold">
                    {t("landing.demo.phoneLabel")}
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    ({t("landing.demo.phoneOptional")})
                  </span>
                </div>
                <Input
                  id="demo-phone"
                  type="tel"
                  value={phoneNumber}
                  maxLength={CONTACT_LEAD_MAX_PHONE_LENGTH}
                  onChange={(event) => {
                    setPhoneNumber(event.target.value);
                    if (fieldErrors.phoneNumber) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        phoneNumber: undefined,
                      }));
                    }
                  }}
                  placeholder={t("landing.demo.phonePlaceholder")}
                  aria-invalid={Boolean(fieldErrors.phoneNumber)}
                  className="h-10 bg-background"
                />
                {fieldErrors.phoneNumber ? (
                  <p className="text-xs text-destructive">
                    {t(fieldErrors.phoneNumber)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {t("landing.demo.needsLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("landing.demo.needsHint")}
                </p>
              </div>

              <div
                role="group"
                aria-label={t("landing.demo.needsLabel")}
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
              >
                {NEED_CARDS.map((card) => {
                  const Icon = card.icon;
                  const selected = selectedNeeds.includes(card.code);
                  return (
                    <button
                      key={card.code}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      onClick={() => toggleNeed(card.code)}
                      className={cn(
                        "group relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                        selected
                          ? "border-primary bg-primary/[0.07] dark:bg-primary/[0.14] ring-1 ring-primary/30"
                          : "border-border/80 bg-background/60 hover:border-primary/40 hover:bg-muted/40",
                        card.code === "OTHER" && "sm:col-span-2",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                          selected
                            ? "border-primary/40 bg-primary text-primary-foreground"
                            : "border-border bg-muted/60 text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block text-xs sm:text-sm font-semibold text-foreground">
                          {t(card.titleKey)}
                        </span>
                        <span className="block text-xs leading-relaxed text-muted-foreground">
                          {t(card.descKey)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        {selected ? <Check className="size-3.5" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {fieldErrors.needs ? (
                <p className="text-xs text-destructive">{t(fieldErrors.needs)}</p>
              ) : null}

              {hasOtherSelected ? (
                <div className="space-y-2 rounded-xl border border-primary/30 bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="demo-other-detail"
                      className="text-xs font-semibold text-foreground"
                    >
                      {t("landing.demo.otherDetailLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {otherNeedDetail.length}/{CONTACT_LEAD_MAX_OTHER_DETAIL_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    id="demo-other-detail"
                    rows={3}
                    value={otherNeedDetail}
                    maxLength={CONTACT_LEAD_MAX_OTHER_DETAIL_LENGTH}
                    onChange={(event) => {
                      setOtherNeedDetail(event.target.value);
                      if (fieldErrors.otherNeedDetail) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          otherNeedDetail: undefined,
                        }));
                      }
                    }}
                    placeholder={t("landing.demo.otherDetailPlaceholder")}
                    aria-invalid={Boolean(fieldErrors.otherNeedDetail)}
                    className="bg-background text-sm"
                  />
                  {fieldErrors.otherNeedDetail ? (
                    <p className="text-xs text-destructive">
                      {t(fieldErrors.otherNeedDetail)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-border/70 pt-4 sm:flex-row sm:items-center">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t("landing.demo.directEmailNote")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {DIRECT_CONTACT_EMAILS.map((contactEmail) => (
                    <a
                      key={contactEmail}
                      href={`mailto:${contactEmail}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                    >
                      <Mail className="size-3.5 text-primary" />
                      <span>{contactEmail}</span>
                    </a>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="h-10 px-6 text-sm font-semibold rounded-md gap-2 shrink-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t("landing.demo.submittingBtn")}</span>
                  </>
                ) : (
                  <>
                    <Mail className="size-4" />
                    <span>{t("landing.demo.submitBtn")}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

