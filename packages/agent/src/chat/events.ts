import { z } from "zod"

/**
 * Event-Driven Stream Events for the Parliament Agent Runtime.
 * Strongly typed discriminated union emitted over Server-Sent Events (SSE)
 * to client interfaces, diagnostic tools, and persistence collectors.
 */

export const tokenUsageSchema = z.object({
  promptTokens: z.number().nonnegative(),
  completionTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  cachedPromptTokens: z.number().nonnegative().optional(),
})

export type TokenUsage = z.infer<typeof tokenUsageSchema>

export const agentEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("turn:start"),
    conversationId: z.string(),
    model: z.string(),
    timestamp: z.string(),
  }),
  z.object({
    type: z.literal("thinking:delta"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("content:delta"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("openui:chunk"),
    delta: z.string(),
  }),
  z.object({
    type: z.literal("tool:called"),
    callId: z.string(),
    name: z.string(),
    args: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("tool:executing"),
    callId: z.string(),
    name: z.string(),
  }),
  z.object({
    type: z.literal("tool:result"),
    callId: z.string(),
    name: z.string(),
    result: z.unknown(),
    isError: z.boolean(),
  }),
  z.object({
    type: z.literal("action:approval_required"),
    approvalId: z.string(),
    callId: z.string(),
    toolName: z.string(),
    args: z.record(z.string(), z.unknown()),
    summary: z.string(),
    expiresAt: z.string(),
  }),
  z.object({
    type: z.literal("turn:suspended"),
    reason: z.enum([
      "awaiting_approval",
      "questionnaire_submitted",
      "budget_cap",
    ]),
    approvalId: z.string().optional(),
  }),
  z.object({
    type: z.literal("turn:completed"),
    totalSteps: z.number().nonnegative(),
    usage: tokenUsageSchema.optional(),
  }),
  z.object({
    type: z.literal("turn:error"),
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean(),
  }),
])

export type AgentEvent = z.infer<typeof agentEventSchema>

/**
 * Encodes an AgentEvent as a Server-Sent Event formatted string.
 */
export function formatServerSentEvent(event: AgentEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}
