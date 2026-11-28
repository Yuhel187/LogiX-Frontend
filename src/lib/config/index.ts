const DEFAULT_API_BASE_URL = "http://localhost:3000/api/v1";
const DEFAULT_WS_BASE_URL = "http://localhost:3000";

/** API Gateway origin. Browser-visible by design; never put a secret here. */
function readApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return DEFAULT_API_BASE_URL;
  return trimmed.replace(/\/+$/, "");
}

export const apiBaseUrl = readApiBaseUrl();

function readWsBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_WS_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed) return trimmed.replace(/\/+$/, "");
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return DEFAULT_WS_BASE_URL;
  }
}

export const wsBaseUrl = readWsBaseUrl();
