"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/lib/i18n";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { confirmOrderApi, getConfirmationPreviewApi } from "../api/orders.api";
import type { ConfirmationPreview, OrderDetail } from "../schemas/order.schema";
import { resolveOrderError } from "../utils/order-errors";

interface Props {
  order: OrderDetail;
  onClose: () => void;
  onConfirmed: (order: OrderDetail) => void;
  onConflict: () => void;
}

export function ConfirmOrderDialog({ order, onClose, onConfirmed, onConflict }: Props) {
  const { t, locale } = useTranslation();
  const [preview, setPreview] = useState<ConfirmationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getConfirmationPreviewApi(order.id).then((result) => {
      if (!active) return;
      if (result.version !== order.version) {
        onConflict();
        return;
      }
      setPreview(result);
      setLoading(false);
    }).catch((cause: unknown) => {
      if (!active) return;
      setError(resolveOrderError(cause, t).message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [order.id, order.version, reload, t, onConflict]);

  const submit = async () => {
    if (!preview || submitting || loading) return;
    setSubmitting(true);
    setError(null);
    try {
      onConfirmed(await confirmOrderApi(order.id, preview.version, order.status === "PENDING_STOCK"));
    } catch (cause) {
      const resolved = resolveOrderError(cause, t);
      if (resolved.reason === "ORDER_VERSION_CONFLICT" || resolved.reason === "ORDER_INVALID_TRANSITION") {
        onConflict();
      } else {
        setError(resolved.reason === "UPSTREAM_UNAVAILABLE" ? t("orders.confirm.unavailable") : resolved.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("orders.confirm.title", { orderNumber: order.orderNumber })}</DialogTitle>
          <DialogDescription>{t("orders.confirm.description")}</DialogDescription>
        </DialogHeader>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div> : null}
        {preview && !loading ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("orders.confirm.reference", { date: formatDateTime(preview.checkedAt, locale) })}</p>
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t("orders.shortage.sku")}</TableHead>
                  <TableHead className="text-right">{t("orders.shortage.required")}</TableHead>
                  <TableHead className="text-right">{t("orders.shortage.available")}</TableHead>
                  <TableHead>{t("orders.confirm.result")}</TableHead>
                </TableRow></TableHeader>
                <TableBody>{preview.lines.map((line) => (
                  <TableRow key={line.productId}>
                    <TableCell>{order.lines.find((item) => item.productId === line.productId)?.skuSnapshot ?? line.productId}</TableCell>
                    <TableCell className="text-right">{formatDecimal(line.required, locale)}</TableCell>
                    <TableCell className="text-right">{formatDecimal(line.available, locale)}</TableCell>
                    <TableCell className={line.sufficient ? "text-green-600" : "text-destructive"}>{t(line.sufficient ? "orders.confirm.sufficient" : "orders.confirm.insufficient")}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            {preview.lines.some((line) => !line.sufficient) ? <Alert><AlertDescription>{t("orders.confirm.pendingWarning")}</AlertDescription></Alert> : null}
          </div>
        ) : null}
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={onClose}>{t("orders.cancel.dismiss")}</Button>
          {!preview && !loading ? <Button onClick={() => { setError(null); setLoading(true); setReload((value) => value + 1); }}>{t("orders.actions.retry")}</Button> : null}
          <Button disabled={!preview || submitting || loading} onClick={submit}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {t(order.status === "PENDING_STOCK" ? "orders.confirm.retry" : "orders.confirm.action")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
