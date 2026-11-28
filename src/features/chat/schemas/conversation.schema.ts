import { z } from "zod";

export const conversationStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;

export const conversationListItemSchema = z
  .object({
    conversationId: z.string().uuid(),
    threadId: z.string().min(1),
    userId: z.string().uuid(),
    title: z.string().nullable(),
    status: conversationStatusSchema,
    messageCount: z.number().int().nonnegative(),
    executionCount: z.number().int().nonnegative(),
    lastModel: z.string().nullable(),
    totalInputTokens: z.number().int().nonnegative(),
    totalOutputTokens: z.number().int().nonnegative(),
    createdAt: z.string().min(1),
    lastMessageAt: z.string().min(1),
  })
  .strict();

export type ConversationListItem = z.infer<typeof conversationListItemSchema>;

export const conversationPageSchema = z
  .object({
    items: z.array(conversationListItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
  .strict();

export type ConversationPage = z.infer<typeof conversationPageSchema>;

export const redactedMessageSchema = z
  .object({
    id: z.string().uuid(),
    role: z.string().min(1),
    content: z.string(),
    sequence: z.number().int().positive(),
    createdAt: z.string().min(1),
  })
  .strict();

export type RedactedMessage = z.infer<typeof redactedMessageSchema>;

export const executionSummarySchema = z
  .object({
    id: z.string().uuid(),
    status: z.string().min(1),
    provider: z.string().nullable(),
    model: z.string().nullable(),
    latencyMs: z.number().int().nonnegative().nullable(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    errorCode: z.string().nullable(),
    createdAt: z.string().min(1),
    finishedAt: z.string().nullable(),
  })
  .strict();

export type ExecutionSummary = z.infer<typeof executionSummarySchema>;

export const conversationDetailSchema = conversationListItemSchema
  .extend({
    isOwner: z.boolean(),
    messages: z.array(redactedMessageSchema),
    executions: z.array(executionSummarySchema),
  })
  .strict();

export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export const updateConversationInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    status: conversationStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) => value.title !== undefined || value.status !== undefined,
    { message: "At least one field (title or status) is required." },
  );

export type UpdateConversationInput = z.infer<typeof updateConversationInputSchema>;
