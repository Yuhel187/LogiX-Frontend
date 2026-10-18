"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, AlertCircle, BellRing } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { updateLowStockThresholdApi } from "../api/inventory.api";
import {
  updateLowStockThresholdSchema,
  type InventoryBalance,
} from "../schemas/inventory.schema";
import { formatQuantity } from "../utils/quantity";

export interface LowStockThresholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: InventoryBalance | null;
  warehouseLabel?: string;
  productLabel?: string;
  onUpdated: () => void;
}

function LowStockThresholdForm({
  balance,
  warehouseLabel,
  productLabel,
  onClose,
  onUpdated,
}: {
  balance: InventoryBalance;
  warehouseLabel?: string;
  productLabel?: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { t } = useTranslation();
  const [threshold, setThreshold] = React.useState(balance.lowStockThreshold || "0");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = threshold.trim();

    const validation = updateLowStockThresholdSchema.safeParse({
      lowStockThreshold: trimmed,
    });

    if (!validation.success) {
      setError(t("inventory.threshold.invalidValue"));
      return;
    }

    setSubmitting(true);
    try {
      await updateLowStockThresholdApi(
        balance.warehouseId,
        balance.productId,
        validation.data
      );
      toast.success(t("inventory.threshold.success"));
      onUpdated();
      onClose();
    } catch {
      setError(t("inventory.threshold.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <BellRing className="size-4 text-amber-500" />
          <DialogTitle className="text-base font-semibold">
            {t("inventory.threshold.title")}
          </DialogTitle>
        </div>
        <DialogDescription className="text-xs text-muted-foreground">
          {warehouseLabel && productLabel
            ? `${warehouseLabel} • ${productLabel}`
            : t("inventory.threshold.description")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("inventory.threshold.currentAvailable")}</span>
          <span className="font-semibold font-mono text-foreground">
            {formatQuantity(balance.availableQuantity)}
          </span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="threshold-val" className="text-xs">
            {t("inventory.threshold.label")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="threshold-val"
            type="text"
            inputMode="decimal"
            placeholder={t("inventory.threshold.placeholder")}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="h-8 text-xs font-mono"
            disabled={submitting}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("inventory.threshold.hint")}
          </p>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={submitting}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !threshold.trim()}
        >
          {submitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
          {t("inventory.threshold.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LowStockThresholdDialog({
  open,
  onOpenChange,
  balance,
  warehouseLabel,
  productLabel,
  onUpdated,
}: LowStockThresholdDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && balance && (
          <LowStockThresholdForm
            balance={balance}
            warehouseLabel={warehouseLabel}
            productLabel={productLabel}
            onClose={() => onOpenChange(false)}
            onUpdated={onUpdated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
