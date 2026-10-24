"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import type { Customer } from "../../schemas/customer.schema";
import { disableCustomerApi } from "../../api/customers.api";

interface DisableCustomerDialogProps {
  customer: Customer | null;
  onClear: () => void;
  onDone: () => void;
}

export function DisableCustomerDialog({
  customer,
  onClear,
  onDone,
}: DisableCustomerDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!customer) return;
    try {
      setIsSubmitting(true);
      await disableCustomerApi(customer.id, reason.trim() || undefined);
      toast.success(t("masterData.actionSuccess"));
      setReason("");
      onClear();
      onDone();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={customer !== null}
      onOpenChange={(open) => {
        if (!open) {
          setReason("");
          onClear();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {t("masterData.disableTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("masterData.customer.disableDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {customer ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-semibold">{customer.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{customer.code}</p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="disable-reason">
              {t("masterData.customer.disableReason")}
            </Label>
            <Textarea
              id="disable-reason"
              placeholder={t("masterData.customer.disableReasonPlaceholder")}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setReason("");
              onClear();
            }}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("masterData.working") : t("masterData.disable")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
