import { isApiError } from "@/lib/api";

type Translate = (path: string, params?: Record<string, string>) => string;

export const ORDER_ERROR_REASONS = [
  "ORDER_NOT_FOUND",
  "ORDER_INVALID_TRANSITION",
  "ORDER_VERSION_CONFLICT",
  "ORDER_NO_CHANGES",
  "ORDER_INVALID_DATE_RANGE",
  "ORDER_ADDRESS_NOT_OF_CUSTOMER",
  "ORDER_ADDRESS_NOT_SHIPPING",
  "ORDER_MASTER_DATA_NOT_FOUND",
  "ORDER_MASTER_DATA_INACTIVE",
  "ORDER_DUPLICATE_PRODUCT",
  "ORDER_TOO_MANY_LINES",
  "IDEMPOTENCY_KEY_REQUIRED",
  "IDEMPOTENCY_KEY_REUSED",
  "UPSTREAM_UNAVAILABLE",
  "UPSTREAM_REJECTED",
] as const;

export type OrderErrorReason = (typeof ORDER_ERROR_REASONS)[number];

export type OrderHeaderField = "customerId" | "deliveryAddressId" | "warehouseId";

export interface ResolvedOrderError {
  reason: OrderErrorReason | null;
  message: string;
  /** Header input the error belongs to, when the backend names one. */
  field: OrderHeaderField | "lines" | null;
  /** Zero-based line index for `lines[i].productId` errors. */
  lineIndex: number | null;
}

const HEADER_FIELDS: readonly string[] = [
  "customerId",
  "deliveryAddressId",
  "warehouseId",
];
const LINE_FIELD_PATTERN = /^lines\[(\d+)\]/;

function isOrderErrorReason(value: unknown): value is OrderErrorReason {
  return (
    typeof value === "string" &&
    (ORDER_ERROR_REASONS as readonly string[]).includes(value)
  );
}

function stringParams(
  details: Readonly<Record<string, unknown>>
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "string" || typeof value === "number") {
      params[key] = String(value);
    }
  }
  return params;
}

/**
 * Turns a failed order request into a localized message plus the input it
 * belongs to. Reasons come from `details.reason`; anything unknown keeps the
 * server message so no information is hidden from the user.
 */
export function resolveOrderError(
  error: unknown,
  t: Translate
): ResolvedOrderError {
  if (!isApiError(error)) {
    return {
      reason: null,
      message: t("orders.errors.generic"),
      field: null,
      lineIndex: null,
    };
  }

  const details = error.details ?? {};
  const reason = isOrderErrorReason(details.reason) ? details.reason : null;
  const message = reason
    ? t(`orders.errors.${reason}`, stringParams(details))
    : error.message;

  const rawField = typeof details.field === "string" ? details.field : "";
  const lineMatch = LINE_FIELD_PATTERN.exec(rawField);

  if (lineMatch) {
    return { reason, message, field: null, lineIndex: Number(lineMatch[1]) };
  }
  if (HEADER_FIELDS.includes(rawField)) {
    return {
      reason,
      message,
      field: rawField as OrderHeaderField,
      lineIndex: null,
    };
  }
  if (rawField === "lines") {
    return { reason, message, field: "lines", lineIndex: null };
  }
  return { reason, message, field: null, lineIndex: null };
}
