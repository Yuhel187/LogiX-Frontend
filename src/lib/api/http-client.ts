import { ApiError, GENERIC_API_ERROR_MESSAGE } from "./errors";

const ACCESS_TOKEN_KEY = "logix_access_token";

// =======================================================
// TOKEN STORAGE
// =======================================================
export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

// =======================================================
// SESSION HANDLERS
// Transport knows when a session must be renewed, not how. The owning feature
// registers the domain implementation.
// =======================================================
export type SessionRefreshHandler = () => Promise<string>;
export type SessionExpiredHandler = () => void;

let refreshHandler: SessionRefreshHandler | null = null;
let expiredHandler: SessionExpiredHandler | null = null;

export function registerSessionHandlers(handlers: {
  refreshSession?: SessionRefreshHandler;
  onSessionExpired?: SessionExpiredHandler;
}): void {
  if (handlers.refreshSession) {
    refreshHandler = handlers.refreshSession;
  }
  if (handlers.onSessionExpired) {
    expiredHandler = handlers.onSessionExpired;
  }
}

// =======================================================
// RESPONSE HANDLER
// =======================================================
export async function handleResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(data),
      extractErrorCode(data)
    );
  }

  return data as T;
}

function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return GENERIC_API_ERROR_MESSAGE;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) {
    const joined = message.filter((item) => typeof item === "string").join(", ");
    return joined || GENERIC_API_ERROR_MESSAGE;
  }
  if (typeof message === "string" && message.length > 0) return message;
  return GENERIC_API_ERROR_MESSAGE;
}

function extractErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const code = (data as { error?: unknown; code?: unknown });
  if (typeof code.code === "string") return code.code;
  if (typeof code.error === "string") return code.error;
  return undefined;
}

// =======================================================
// SINGLE-FLIGHT REFRESH QUEUE & MUTEX
// =======================================================
let refreshPromise: Promise<string> | null = null;

export async function requestNewAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refresh = refreshHandler;
  if (!refresh) {
    throw new ApiError(
      401,
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
    );
  }

  refreshPromise = (async () => {
    try {
      return await refresh();
    } catch (err) {
      setStoredAccessToken(null);
      if (expiredHandler) {
        expiredHandler();
      }
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// =======================================================
// AUTO-REFRESH FETCH INTERCEPTOR (401 RETRY)
// =======================================================
export interface AuthFetchOptions extends RequestInit {
  accessToken?: string;
  skipAuthRefresh?: boolean;
}

export async function authFetch(
  url: string,
  options: AuthFetchOptions = {}
): Promise<Response> {
  const {
    accessToken: explicitToken,
    skipAuthRefresh = false,
    headers: initialHeaders,
    ...restOptions
  } = options;

  const buildHeaders = (token: string | null) => {
    const headers = new Headers(initialHeaders || {});
    if (!headers.has("Content-Type") && !(restOptions.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    const resolvedToken = token || explicitToken || getStoredAccessToken();
    if (resolvedToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${resolvedToken}`);
    }
    return headers;
  };

  const initialToken = explicitToken || getStoredAccessToken();
  const headers = buildHeaders(initialToken);

  let response = await fetch(url, {
    ...restOptions,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && !skipAuthRefresh) {
    try {
      const newToken = await requestNewAccessToken();
      const retryHeaders = buildHeaders(newToken);
      response = await fetch(url, {
        ...restOptions,
        headers: retryHeaders,
        credentials: "include",
      });
    } catch {
      return response;
    }
  }

  return response;
}

// =======================================================
// QUERY SERIALIZATION
// =======================================================
export type QueryParamValue = string | number | boolean | null | undefined;

export function toQueryString(
  params: Record<string, QueryParamValue>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}
