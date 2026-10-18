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
    if (error.status === 409)
      return t("shipments.errors.SHIPMENT_VERSION_CONFLICT");
    if (error.status === 404) return t("shipments.errors.SHIPMENT_NOT_FOUND");
  }
  return t("shipments.errors.generic");
}
