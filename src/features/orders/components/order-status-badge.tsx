"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "@/lib/i18n";
import type { OrderStatus } from "../schemas/order.schema";
import { ORDER_STATUS_TONE } from "../constants/order.constants";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  return (
    <StatusBadge
      status={ORDER_STATUS_TONE[status]}
      label={t(`orders.status.${status}`)}
    />
  );
}
