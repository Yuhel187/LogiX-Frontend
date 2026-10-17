export type ApiErrorDetails = Readonly<Record<string, unknown>>;

/**
 * Normalized transport failure. `details` is the backend's structured,
 * client-safe context (e.g. `reason`, `field`) so features can map errors
 * without parsing messages.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: ApiErrorDetails;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: ApiErrorDetails
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export const GENERIC_API_ERROR_MESSAGE =
  "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";
