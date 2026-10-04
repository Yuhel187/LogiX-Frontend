import { isApiError } from "@/lib/api";

const GENERIC = "Đã xảy ra lỗi. Vui lòng thử lại.";

export function resolveApiErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return GENERIC;
}

/**
 * A 409 always means the tenant-unique code collided, so the message belongs on
 * that field rather than in a toast the user has to connect back to an input.
 */
export function isDuplicateCodeError(error: unknown): boolean {
  return isApiError(error) && error.status === 409;
}
