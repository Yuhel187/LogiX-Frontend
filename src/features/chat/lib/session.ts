const SESSION_KEY = "logix_chat_session_id";
const THREAD_KEY = "logix_chat_thread_id";
const SCOPE_KEY = "logix_chat_scope";

function createId(prefix: string) {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${value}`;
}

export function getOrCreateThreadId(): string {
  if (typeof window === "undefined") return "";
  let threadId = localStorage.getItem(THREAD_KEY);
  if (!threadId) {
    threadId = createId("logix_thread");
    localStorage.setItem(THREAD_KEY, threadId);
  }
  return threadId;
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = createId("logix_session");
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function createNewThreadId(): string {
  const threadId = createId("logix_thread");
  if (typeof window !== "undefined") {
    localStorage.setItem(THREAD_KEY, threadId);
  }
  return threadId;
}

export function saveThreadId(threadId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(THREAD_KEY, threadId);
  }
}

export function getInitialThreadId(): string {
  if (typeof window !== "undefined") {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlThreadId = urlParams.get("threadId");
      if (urlThreadId) {
        localStorage.setItem(THREAD_KEY, urlThreadId);
        return urlThreadId;
      }
    } catch {
      // Ignore URL parsing errors
    }
    return getOrCreateThreadId();
  }
  return "";
}

/**
 * Rotate the active local thread when switching user or tenant so requests
 * never reuse a threadId belonging to a different actor.
 */
export function syncThreadScope(scope: string): string | null {
  if (typeof window === "undefined" || !scope) return null;
  const previousScope = localStorage.getItem(SCOPE_KEY);
  localStorage.setItem(SCOPE_KEY, scope);
  if (previousScope && previousScope !== scope) {
    return createNewThreadId();
  }
  return null;
}

export function clearSessionAndThread(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(THREAD_KEY);
    localStorage.removeItem(SCOPE_KEY);
  }
}
