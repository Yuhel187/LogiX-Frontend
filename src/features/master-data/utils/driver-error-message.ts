import { isApiError } from "@/lib/api";
import { DRIVER_RELINK_ERRORS } from "../constants/driver-relink-errors";

type Translator = (key: string) => string;
type DriverErrorOperation = "read" | "mutation";

export function isDriverConflictError(error: unknown): boolean {
  return isApiError(error) && error.status === 409;
}

export function isUnknownDriverMutationOutcome(error: unknown): boolean {
  return !isApiError(error) || error.status === 0 || error.status >= 500;
}

export function resolveDriverErrorMessage(
  error: unknown,
  t: Translator,
  operation: DriverErrorOperation = "read"
): string {
  if (
    operation === "mutation" &&
    isUnknownDriverMutationOutcome(error)
  ) {
    return t("masterData.driver.errors.unknownOutcome");
  }
  if (!isApiError(error)) return t("masterData.driver.errors.generic");

  if (error.code === DRIVER_RELINK_ERRORS.contextChanged) {
    return t("masterData.driver.errors.contextChanged");
  }
  if (error.code === DRIVER_RELINK_ERRORS.locked) {
    return t("masterData.driver.errors.linkLocked");
  }
  if (error.code === DRIVER_RELINK_ERRORS.unchanged) {
    return t("masterData.driver.validation.differentUser");
  }
  if (error.code === DRIVER_RELINK_ERRORS.invalidPreview) {
    return t("masterData.driver.errors.previewMismatch");
  }
  if (
    error.code === "CONCURRENCY_CONFLICT" ||
    error.code === "CONFLICT" ||
    error.status === 409
  ) {
    return t("masterData.driver.errors.conflict");
  }
  if (error.code === "NOT_FOUND") {
    return t("masterData.driver.errors.notFound");
  }
  if (error.status >= 500) {
    return operation === "mutation"
      ? t("masterData.driver.errors.unknownOutcome")
      : t("masterData.driver.errors.unavailable");
  }
  if (error.code === "BAD_GATEWAY" || error.code === "SERVICE_UNAVAILABLE") {
    return operation === "mutation"
      ? t("masterData.driver.errors.unknownOutcome")
      : t("masterData.driver.errors.unavailable");
  }
  if (error.code === "UNAUTHORIZED" || error.status === 401) {
    return t("masterData.driver.errors.unauthorized");
  }
  if (error.code === "FORBIDDEN" || error.status === 403) {
    return t("masterData.driver.errors.forbidden");
  }
  if (error.status === 400) return t("masterData.driver.errors.invalid");
  if (error.status === 404) return t("masterData.driver.errors.notFound");
  return t("masterData.driver.errors.generic");
}
