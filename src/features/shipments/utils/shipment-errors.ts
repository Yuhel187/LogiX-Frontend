import { isApiError } from "@/lib/api";
type Translate = (key: string) => string;
const REASONS = [
  "SHIPMENT_NOT_FOUND",
  "SHIPMENT_VERSION_CONFLICT",
  "SHIPMENT_INVALID_TRANSITION",
  "SHIPMENT_DISPATCH_PENDING",
  "ORDER_UNAVAILABLE",
  "ORDER_REJECTED",
] as const;
export function shipmentError(error: unknown, t: Translate): string {
  if (isApiError(error)) {
    const reason = error.details?.reason;
    if (typeof reason === "string" && REASONS.some((item) => item === reason))
      return t(`shipments.errors.${reason}`);
    if (error.status === 401) return t("shipments.errors.unauthorized");
    if (error.status === 403) return t("shipments.errors.forbidden");
    if (error.status === 400) return t("shipments.errors.invalidRequest");
    if (error.status === 409) return t("shipments.errors.conflict");
    if (error.status === 404) return t("shipments.errors.SHIPMENT_NOT_FOUND");
    if (error.status === 0) return t("shipments.errors.connection");
    if (error.status >= 500) return t("shipments.errors.unavailable");
  }
  if (
    error instanceof TypeError ||
    (error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name))
  )
    return t("shipments.errors.connection");

  return t("shipments.errors.generic");
}

export function shipmentOutcomeUnknown(error: unknown): boolean {
  return (
    !isApiError(error) ||
    error.status === 0 ||
    error.status >= 500 ||
    error.code === "INVALID_RESPONSE"
  );
}
