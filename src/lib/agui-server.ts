// Server-only helper for Next.js Route Handlers proxying to agent-service via api-gateway.
export function getAguiBaseUrl(): string {
  return (
    process.env.LOGIX_AGUI_BASE_URL ??
    process.env.NEXT_PUBLIC_LOGIX_AGUI_BASE_URL ??
    "http://localhost:3000/api/v1/agent"
  );
}

export function buildAgentForwardHeaders(request: Request): Record<string, string> {
  const authorization = request.headers.get("authorization");
  const sessionId = request.headers.get("x-logix-chat-session-id");
  return {
    ...(authorization ? { Authorization: authorization } : {}),
    ...(sessionId ? { "x-logix-chat-session-id": sessionId } : {}),
  };
}
