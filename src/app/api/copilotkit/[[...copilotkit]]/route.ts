import { HttpAgent } from "@ag-ui/client";
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import type { AgentsConfig } from "@copilotkit/runtime/v2";

const AGENT_ID = "logix-copilot";

const AGUI_BASE_URL =
  process.env.LOGIX_AGUI_BASE_URL ??
  process.env.NEXT_PUBLIC_LOGIX_AGUI_BASE_URL ??
  "http://localhost:8001/api/v1/agui/web-chat";

function createLogixAgent(
  agentId: string,
  sessionId?: string | null,
  authorization?: string | null,
) {
  const headers: Record<string, string> = {
    ...(authorization ? { Authorization: authorization } : {}),
  };

  return new HttpAgent({
    url: `${AGUI_BASE_URL}/runs`,
    agentId,
    description: "LogiX Copilot Agent over AG-UI",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    fetch: async (url, requestInit) => {
      try {
        const body = JSON.parse(String(requestInit.body ?? "{}"));
        const response = await fetch(url, {
          ...requestInit,
          body: JSON.stringify({
            ...body,
            forwardedProps: {
              ...(body.forwardedProps ?? {}),
              metadata: {
                ...(body.forwardedProps?.metadata ?? {}),
                ...(sessionId ? { sessionId } : {}),
                source: "copilotkit-runtime",
              },
            },
          }),
        });
        return response;
      } catch (err) {
        console.warn("[createLogixAgent] Backend agent warning:", err);
        return new Response(
          JSON.stringify({
            error: "Backend agent is currently unreachable",
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }
    },
  });
}

function normalizeCopilotKitRequest(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/infoRequest")) {
    url.pathname = url.pathname.replace(/\/infoRequest$/, "/info");
    return new Request(url, request);
  }
  return request;
}

function handleCopilotKitRequest(request: Request) {
  const url = new URL(request.url);
  const sessionId =
    request.headers.get("x-logix-chat-session-id") ??
    url.searchParams.get("sessionId");
  const authorization = request.headers.get("authorization");

  const agents = {
    default: createLogixAgent("default", sessionId, authorization),
    [AGENT_ID]: createLogixAgent(AGENT_ID, sessionId, authorization),
    "prebuilt-sidebar": createLogixAgent(
      "prebuilt-sidebar",
      sessionId,
      authorization
    ),
  } as unknown as AgentsConfig;

  const runtime = new CopilotRuntime({
    agents,
  } as unknown as ConstructorParameters<typeof CopilotRuntime>[0]);

  const normalized = normalizeCopilotKitRequest(request);
  const normalizedUrl = new URL(normalized.url);
  const isSingleRouteRequest =
    normalized.method === "POST" &&
    (normalizedUrl.pathname === "/api/copilotkit" ||
      normalizedUrl.pathname === "/api/copilotkit/");

  const handler = createCopilotRuntimeHandler({
    runtime,
    basePath: "/api/copilotkit",
    cors: true,
    ...(isSingleRouteRequest ? { mode: "single-route" as const } : {}),
  });

  return handler(normalized);
}

export function GET(request: Request) {
  return handleCopilotKitRequest(request);
}

export function POST(request: Request) {
  return handleCopilotKitRequest(request);
}

export function OPTIONS(request: Request) {
  return handleCopilotKitRequest(request);
}
