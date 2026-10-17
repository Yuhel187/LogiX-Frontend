"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import { cancelOrderApi } from "../api/orders.api";
import {
  CANCEL_REASON_MAX_LENGTH,
  type OrderDetail,
} from "../schemas/order.schema";
import { resolveOrderError } from "../utils/order-errors";

interface CancelOrderDialogProps {
  order: OrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCanceled: (order: OrderDetail) => void;
  onConflict: () => void;
  onFailure: (message: string) => void;
}

const REASON_FIELD_ID = "cancel-order-reason";

export function CancelOrderDialog({
  order,
  open,
  onOpenChange,
  onCanceled,
  onConflict,
  onFailure,
}: CancelOrderDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return;
    if (!next) {
      setReason("");
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t("orders.validation.cancelReasonRequired"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const canceled = await cancelOrderApi(order.id, {
        version: order.version,
        reason: trimmed,
      });
      setReason("");
      onCanceled(canceled);
    } catch (cause) {
      const resolved = resolveOrderError(cause, t);
      if (resolved.reason === "ORDER_VERSION_CONFLICT") {
        onConflict();
      } else {
        onFailure(resolved.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("orders.cancel.title", { orderNumber: order.orderNumber })}
          </DialogTitle>
          <DialogDescription>{t("orders.cancel.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={REASON_FIELD_ID}>{t("orders.cancel.reason")}</Label>
          <Textarea
            id={REASON_FIELD_ID}
            value={reason}
            maxLength={CANCEL_REASON_MAX_LENGTH}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("orders.cancel.reasonPlaceholder")}
            aria-invalid={Boolean(error) || undefined}
            disabled={isSubmitting}
            rows={4}
          />
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-destructive">{error}</span>
            <span className="text-muted-foreground">
              {reason.length}/{CANCEL_REASON_MAX_LENGTH}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("orders.cancel.dismiss")}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("orders.cancel.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
