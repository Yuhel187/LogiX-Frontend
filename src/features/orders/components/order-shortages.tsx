"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/lib/i18n";
import { formatDateTime, formatDecimal } from "@/lib/format";
import type { OrderDetail, OrderShortage } from "../schemas/order.schema";
import { OrderProductLabel } from "./order-product-label";

export function OrderShortages({ order, shortages }: { order: OrderDetail; shortages: OrderShortage[] }) {
  const { t, locale } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("orders.shortage.title")}</CardTitle>
        {order.pendingSince ? <p className="text-xs text-muted-foreground">{t("orders.shortage.pendingSince", { date: formatDateTime(order.pendingSince, locale) })}</p> : null}
      </CardHeader>
      <CardContent>
        {shortages.length === 0 ? <p className="text-sm text-muted-foreground">{t("orders.shortage.awaitingCheck")}</p> : (
          <div className="overflow-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>{t("orders.shortage.sku")}</TableHead>
              <TableHead className="text-right">{t("orders.shortage.required")}</TableHead>
              <TableHead className="text-right">{t("orders.shortage.available")}</TableHead>
              <TableHead>{t("orders.shortage.detectedAt")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{shortages.map((item) => (
              <TableRow key={item.id}>
                <TableCell><OrderProductLabel order={order} productId={item.productId} /></TableCell>
                <TableCell className="text-right">{formatDecimal(item.required, locale)}</TableCell>
                <TableCell className="text-right">{formatDecimal(item.available, locale)}</TableCell>
                <TableCell>{formatDateTime(item.detectedAt, locale)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table></div>
        )}
      </CardContent>
    </Card>
  );
}
