import { buildAgentForwardHeaders, getAguiBaseUrl } from "@/lib/agui-server";

export async function GET(request: Request) {
  try {
    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(`${getAguiBaseUrl()}/threads`);
    const limit = incomingUrl.searchParams.get("limit");
    if (limit) {
      targetUrl.searchParams.set("limit", limit);
    }

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: buildAgentForwardHeaders(request),
      cache: "no-store",
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    console.error("[threads proxy] GET error:", err);
    return Response.json(
      { error: "Failed to fetch chat threads" },
      { status: 502 }
    );
  }
}
