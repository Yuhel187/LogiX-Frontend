"use client";

import { useState, type FormEvent } from "react";
import { ExternalLink, Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import { adminErrorKey, sendContactLeadEmailApi } from "../api/admin.api";
import {
  sendContactLeadEmailSchema,
  type ContactNeedCategory,
} from "../schemas/admin.schema";
import type { ContactLeadItem } from "../types/admin.types";

type AdminContactEmailDialogProps = {
  lead: ContactLeadItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated: (updated: ContactLeadItem) => void;
};

function getNeedTitleKey(need: ContactNeedCategory): string {
  switch (need) {
    case "ORDER_FULFILLMENT":
      return "landing.demo.needs.ORDER_FULFILLMENT.title";
    case "INVENTORY_WAREHOUSE":
      return "landing.demo.needs.INVENTORY_WAREHOUSE.title";
    case "TRANSPORT_ROUTE":
      return "landing.demo.needs.TRANSPORT_ROUTE.title";
    case "DRIVER_DELIVERY":
      return "landing.demo.needs.DRIVER_DELIVERY.title";
    case "DEMAND_FORECAST":
      return "landing.demo.needs.DEMAND_FORECAST.title";
    case "ENTERPRISE_RBAC":
      return "landing.demo.needs.ENTERPRISE_RBAC.title";
    case "OTHER":
      return "landing.demo.needs.OTHER.title";
  }
}

export function AdminContactEmailDialog({
  lead,
  open,
  onOpenChange,
  onLeadUpdated,
}: AdminContactEmailDialogProps) {
  const { t } = useTranslation();
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    subject?: string;
    message?: string;
  }>({});
  const [submitErrorKey, setSubmitErrorKey] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (lead && lead.id !== activeLeadId) {
    const needTitles = lead.needs
      .map((need) => t(getNeedTitleKey(need)))
      .join(", ");
    setActiveLeadId(lead.id);
    setSubject(
      t("admin.contacts.emailDialog.defaultSubject", {
        company: lead.companyName,
      }),
    );
    setMessage(
      t("admin.contacts.emailDialog.defaultMessage", {
        company: lead.companyName,
        needs: needTitles,
      }),
    );
    setFieldErrors({});
    setSubmitErrorKey(null);
  }

  if (!lead) return null;

  const mailtoHref = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitErrorKey(null);

    const parsed = sendContactLeadEmailSchema.safeParse({ subject, message });
    if (!parsed.success) {
      const nextErrors: { subject?: string; message?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "subject" && !nextErrors.subject) {
          nextErrors.subject = t("admin.contacts.emailDialog.subjectRequired");
        }
        if (key === "message" && !nextErrors.message) {
          nextErrors.message = t("admin.contacts.emailDialog.messageRequired");
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSending(true);
    try {
      const updated = await sendContactLeadEmailApi(lead.id, parsed.data);
      onLeadUpdated(updated);
      toast.success(t("admin.contacts.emailSentSuccess"));
      onOpenChange(false);
    } catch (cause: unknown) {
      setSubmitErrorKey(adminErrorKey(cause));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Mail className="size-3.5" aria-hidden="true" />
            <span>{lead.companyName}</span>
          </div>
          <DialogTitle>{t("admin.contacts.emailDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.contacts.emailDialog.description", {
              name: lead.fullName,
              email: lead.email,
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-foreground">
                  {t("admin.contacts.emailDialog.recipientLabel")}:
                </span>{" "}
                <span className="text-muted-foreground">
                  {lead.fullName} &lt;{lead.email}&gt;
                </span>
              </div>
              <Badge variant="outline">{lead.companyName}</Badge>
            </div>
          </div>

          {submitErrorKey ? (
            <Alert variant="destructive">
              <AlertDescription>{t(submitErrorKey)}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="contact-email-subject">
              {t("admin.contacts.emailDialog.subjectLabel")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-email-subject"
              value={subject}
              maxLength={200}
              onChange={(event) => {
                setSubject(event.target.value);
                if (fieldErrors.subject) {
                  setFieldErrors((prev) => ({ ...prev, subject: undefined }));
                }
              }}
              placeholder={t("admin.contacts.emailDialog.subjectPlaceholder")}
              aria-invalid={Boolean(fieldErrors.subject)}
            />
            {fieldErrors.subject ? (
              <p className="text-xs font-medium text-destructive">
                {fieldErrors.subject}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email-message">
              {t("admin.contacts.emailDialog.messageLabel")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="contact-email-message"
              value={message}
              maxLength={4000}
              rows={6}
              onChange={(event) => {
                setMessage(event.target.value);
                if (fieldErrors.message) {
                  setFieldErrors((prev) => ({ ...prev, message: undefined }));
                }
              }}
              placeholder={t("admin.contacts.emailDialog.messagePlaceholder")}
              aria-invalid={Boolean(fieldErrors.message)}
            />
            {fieldErrors.message ? (
              <p className="text-xs font-medium text-destructive">
                {fieldErrors.message}
              </p>
            ) : null}
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" asChild>
              <a href={mailtoHref}>
                <ExternalLink className="size-4" aria-hidden="true" />
                {t("admin.contacts.emailDialog.openMailClient")}
              </a>
            </Button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={isSending}
                onClick={() => onOpenChange(false)}
              >
                {t("admin.contacts.emailDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    {t("admin.contacts.emailDialog.sending")}
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden="true" />
                    {t("admin.contacts.emailDialog.sendSmtp")}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

