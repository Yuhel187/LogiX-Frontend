import { buildAgentForwardHeaders, getAguiBaseUrl } from "@/lib/agui-server";
import { deleteThreadFromSqlite } from "@/lib/sqlite-runner";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;

  try {
    const targetUrl = `${getAguiBaseUrl()}/threads/${encodeURIComponent(threadId)}`;
    const response = await fetch(targetUrl, {
      method: "DELETE",
      headers: buildAgentForwardHeaders(request),
    });

    if (response.ok) {
      deleteThreadFromSqlite(threadId);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    console.error("[threads proxy] DELETE error:", err);
    return Response.json(
      { error: "Failed to delete chat thread" },
      { status: 502 }
    );
  }
}
