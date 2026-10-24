export {
  ApiError,
  isApiError,
  GENERIC_API_ERROR_MESSAGE,
  type ApiErrorDetails,
} from "./errors";

export {
  getStoredAccessToken,
  setStoredAccessToken,
  registerSessionHandlers,
  handleResponse,
  requestNewAccessToken,
  withSessionTransition,
  authFetch,
  getJson,
  toQueryString,
  type SessionRefreshHandler,
  type SessionExpiredHandler,
  type AuthFetchOptions,
  type QueryParamValue,
} from "./http-client";
