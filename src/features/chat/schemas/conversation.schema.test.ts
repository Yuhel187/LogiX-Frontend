import { describe, expect, it } from "vitest";
import {
  conversationDetailSchema,
  conversationPageSchema,
  updateConversationInputSchema,
} from "./conversation.schema";

describe("conversation schemas", () => {
  it("parses valid paginated conversation list response", () => {
    const parsed = conversationPageSchema.parse({
      items: [
        {
          conversationId: "11111111-1111-4111-8111-111111111111",
          threadId: "logix_thread_12345678",
          userId: "22222222-2222-4222-8222-222222222222",
          title: "Kiểm tra tồn kho kho BD",
          status: "ACTIVE",
          messageCount: 6,
          executionCount: 2,
          lastModel: "gemini-2.5-flash",
          totalInputTokens: 1200,
          totalOutputTokens: 350,
          createdAt: "2026-11-22T10:00:00Z",
          lastMessageAt: "2026-11-22T10:05:00Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.status).toBe("ACTIVE");
  });

  it("parses conversation detail with isOwner and redacted messages", () => {
    const parsed = conversationDetailSchema.parse({
      conversationId: "11111111-1111-4111-8111-111111111111",
      threadId: "logix_thread_12345678",
      userId: "22222222-2222-4222-8222-222222222222",
      isOwner: false,
      title: "Hội thoại vận hành",
      status: "ARCHIVED",
      messageCount: 1,
      executionCount: 0,
      lastModel: null,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      createdAt: "2026-11-22T10:00:00Z",
      lastMessageAt: "2026-11-22T10:05:00Z",
      messages: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          role: "USER",
          content: "Xin chào",
          sequence: 1,
          createdAt: "2026-11-22T10:00:00Z",
        },
      ],
      executions: [],
    });
    expect(parsed.isOwner).toBe(false);
    expect(parsed.messages).toHaveLength(1);
  });

  it("rejects empty update payloads", () => {
    expect(updateConversationInputSchema.safeParse({}).success).toBe(false);
    expect(updateConversationInputSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(
      updateConversationInputSchema.safeParse({ title: "Tiêu đề mới", status: "ARCHIVED" }).success,
    ).toBe(true);
  });
});
