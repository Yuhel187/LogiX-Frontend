import { isApiError } from "@/lib/api";

type Translate = (key: string) => string;

const TRANSPORT_ERROR_CODES = [
  "CONCURRENCY_CONFLICT",
  "BUSINESS_RULE_VIOLATION",
  "INVALID_STATE_TRANSITION",
  "ENTITY_NOT_FOUND",
  "DRIVER_LINK_LOCKED",
  "SERVICE_UNAVAILABLE",
] as const;

export function tripError(error: unknown, t: Translate): string {
  if (!isApiError(error)) {
    if (
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name)
    ) {
      return t("transport.errors.unknownOutcome");
    }
    return t("transport.errors.generic");
  }

  if (
    typeof error.code === "string" &&
    (TRANSPORT_ERROR_CODES as readonly string[]).includes(error.code)
  ) {
    return t(`transport.errors.${error.code}`);
  }
  if (error.status === 401) return t("transport.errors.unauthorized");
  if (error.status === 403) return t("transport.errors.forbidden");
  if (error.status === 400 || error.status === 422)
    return t("transport.errors.invalidRequest");
  if (error.status === 404) return t("transport.errors.ENTITY_NOT_FOUND");
  if (error.status === 409) return t("transport.errors.CONCURRENCY_CONFLICT");
  if (error.status === 0 || error.status >= 500)
    return t("transport.errors.unknownOutcome");
  return t("transport.errors.generic");
}

export function tripOutcomeUnknown(error: unknown): boolean {
  return (
    !isApiError(error) ||
    error.status === 0 ||
    error.status >= 500 ||
    error.code === "INVALID_RESPONSE"
  );
}
