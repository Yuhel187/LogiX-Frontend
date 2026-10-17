"use client";

import { EntityLabel } from "@/components/shared/entity-label";
import type { OrderDetail } from "../schemas/order.schema";

export function OrderProductLabel({
  order,
  productId,
}: {
  order: OrderDetail;
  productId: string;
}) {
  const line = order.lines.find((item) => item.productId === productId);
  return (
    <EntityLabel
      id={productId}
      name={line?.productNameSnapshot}
      code={line?.skuSnapshot}
    />
  );
}
