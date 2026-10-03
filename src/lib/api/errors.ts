/** Normalized transport failure. Carries no backend internals beyond a safe message. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export const GENERIC_API_ERROR_MESSAGE =
  "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";
