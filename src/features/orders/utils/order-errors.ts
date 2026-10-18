import { isApiError } from "@/lib/api";
import { orderStatusSchema } from "../schemas/order.schema";

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
  "ORDER_DISPATCH_COMMITTED",
  "ORDER_DISPATCH_REQUEST_CONFLICT",
  "ORDER_RESERVATION_MISMATCH",
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
 * belongs to. Reasons and HTTP statuses select local copy; backend-language
 * messages are not rendered in a different UI locale.
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
  const params = stringParams(details);
  if (reason === "ORDER_INVALID_TRANSITION") {
    const status = orderStatusSchema.safeParse(details.currentStatus);
    params.currentStatus = status.success
      ? t(`orders.status.${status.data}`)
      : t("orders.errors.currentState");
  }
  const statusKey: Record<number, string> = {
    400: "invalidRequest",
    401: "unauthorized",
    403: "forbidden",
    404: "ORDER_NOT_FOUND",
    409: "ORDER_VERSION_CONFLICT",
    422: "invalidRequest",
    502: "UPSTREAM_UNAVAILABLE",
    503: "UPSTREAM_UNAVAILABLE",
    504: "UPSTREAM_UNAVAILABLE",
  };
  const message = t(
    `orders.errors.${reason ?? statusKey[error.status] ?? "generic"}`,
    params
  );

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
