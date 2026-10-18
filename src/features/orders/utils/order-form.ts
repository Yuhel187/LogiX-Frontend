import {
  ORDER_QUANTITY_PATTERN,
  type CreateOrderInput,
  type OrderDetail,
  type OrderLineInput,
  type UpdateOrderInput,
} from "../schemas/order.schema";
import { DEFAULT_ORDER_CURRENCY } from "../constants/order.constants";
import type { OrderHeaderField } from "./order-errors";

export interface OrderLineDraft {
  /** Stable React key; independent of productId so a line can change product. */
  key: string;
  productId: string;
  quantity: string;
  unit: string;
  unitWeight: string;
  unitVolume: string;
}

export interface OrderFormValues {
  customerId: string;
  deliveryAddressId: string;
  warehouseId: string;
  lines: OrderLineDraft[];
}

export interface LineErrors {
  productId?: string;
  quantity?: string;
}

export interface OrderFormErrors {
  fields: Partial<Record<OrderHeaderField | "lines", string>>;
  /** Keyed by `OrderLineDraft.key` so errors follow the line, not its position. */
  lines: Record<string, LineErrors>;
}

export const EMPTY_FORM_ERRORS: OrderFormErrors = { fields: {}, lines: {} };

type Translate = (path: string, params?: Record<string, string>) => string;

let lineSequence = 0;

export function createLineKey(): string {
  lineSequence += 1;
  return `line-${lineSequence}`;
}

export function emptyLine(): OrderLineDraft {
  return {
    key: createLineKey(),
    productId: "",
    quantity: "",
    unit: "",
    unitWeight: "",
    unitVolume: "",
  };
}

export function emptyOrderForm(): OrderFormValues {
  return {
    customerId: "",
    deliveryAddressId: "",
    warehouseId: "",
    lines: [emptyLine()],
  };
}

/** The backend returns quantities padded to 3 decimals; editing shows the canonical form. */
export function trimDecimal(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

export function orderToFormValues(order: OrderDetail): OrderFormValues {
  return {
    customerId: order.customerId,
    deliveryAddressId: order.deliveryAddressId,
    warehouseId: order.warehouseId,
    lines: order.lines.map((line) => ({
      key: createLineKey(),
      productId: line.productId,
      quantity: trimDecimal(line.quantity),
      unit: line.unitSnapshot,
      unitWeight: line.unitWeight,
      unitVolume: line.unitVolume,
    })),
  };
}

export function hasFormErrors(errors: OrderFormErrors): boolean {
  return (
    Object.values(errors.fields).some(Boolean) ||
    Object.values(errors.lines).some(
      (line) => Boolean(line.productId) || Boolean(line.quantity)
    )
  );
}

/** Mirrors the backend rules so the user sees problems before a round trip. */
export function validateOrderForm(
  values: OrderFormValues,
  t: Translate
): OrderFormErrors {
  const fields: OrderFormErrors["fields"] = {};
  if (!values.customerId) fields.customerId = t("orders.validation.customerRequired");
  if (!values.deliveryAddressId) {
    fields.deliveryAddressId = t("orders.validation.addressRequired");
  }
  if (!values.warehouseId) {
    fields.warehouseId = t("orders.validation.warehouseRequired");
  }
  if (values.lines.length === 0) fields.lines = t("orders.validation.linesRequired");

  const lines: OrderFormErrors["lines"] = {};
  const seenProducts = new Set<string>();
  for (const line of values.lines) {
    const lineErrors: LineErrors = {};
    if (!line.productId) {
      lineErrors.productId = t("orders.validation.productRequired");
    } else if (seenProducts.has(line.productId)) {
      lineErrors.productId = t("orders.validation.productDuplicate");
    } else {
      seenProducts.add(line.productId);
    }

    const quantity = line.quantity.trim();
    if (!quantity) {
      lineErrors.quantity = t("orders.validation.quantityRequired");
    } else if (!ORDER_QUANTITY_PATTERN.test(quantity)) {
      lineErrors.quantity = t("orders.validation.quantityInvalid");
    }

    if (lineErrors.productId || lineErrors.quantity) lines[line.key] = lineErrors;
  }

  return { fields, lines };
}

function toLineInputs(lines: OrderLineDraft[]): OrderLineInput[] {
  return lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity.trim(),
  }));
}

export function toCreateOrderInput(values: OrderFormValues): CreateOrderInput {
  return {
    customerId: values.customerId,
    deliveryAddressId: values.deliveryAddressId,
    warehouseId: values.warehouseId,
    currency: DEFAULT_ORDER_CURRENCY,
    lines: toLineInputs(values.lines),
  };
}

function sameLines(a: OrderLineInput[], b: OrderLineInput[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (line, index) =>
        line.productId === b[index]?.productId &&
        trimDecimal(line.quantity) === trimDecimal(b[index]?.quantity ?? "")
    )
  );
}

/**
 * Builds a PATCH containing only what changed. Customer and address travel
 * together because the backend validates the address against the customer.
 * Returns `null` when nothing changed, so no request is sent.
 */
export function toUpdateOrderInput(
  order: OrderDetail,
  values: OrderFormValues
): UpdateOrderInput | null {
  const patch: UpdateOrderInput = { version: order.version };
  let changed = false;

  if (
    values.customerId !== order.customerId ||
    values.deliveryAddressId !== order.deliveryAddressId
  ) {
    patch.customerId = values.customerId;
    patch.deliveryAddressId = values.deliveryAddressId;
    changed = true;
  }
  if (values.warehouseId !== order.warehouseId) {
    patch.warehouseId = values.warehouseId;
    changed = true;
  }

  const nextLines = toLineInputs(values.lines);
  const currentLines = order.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  }));
  if (!sameLines(nextLines, currentLines)) {
    patch.lines = nextLines;
    changed = true;
  }

  return changed ? patch : null;
}
