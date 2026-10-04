import { isApiError, GENERIC_API_ERROR_MESSAGE } from "@/lib/api";

export function resolveErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return GENERIC_API_ERROR_MESSAGE;
}
