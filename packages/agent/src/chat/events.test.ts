import { describe, expect, test } from "bun:test"
import {
  type AgentEvent,
  agentEventSchema,
  formatServerSentEvent,
} from "./events"

describe("AgentEvent Stream Protocol", () => {
  test("validates turn:start event", () => {
    const event: AgentEvent = {
      type: "turn:start",
      conversationId: "conv-123",
      model: "anthropic/claude-3-7-sonnet",
      timestamp: "2026-08-17T18:00:00.000Z",
    }
    const parsed = agentEventSchema.safeParse(event)
    expect(parsed.success).toBe(true)
  })

  test("validates thinking:delta and content:delta", () => {
    const thinking = agentEventSchema.safeParse({
      type: "thinking:delta",
      text: "Analyzing pipeline health...",
    })
    expect(thinking.success).toBe(true)

    const content = agentEventSchema.safeParse({
      type: "content:delta",
      text: "Here are your active deals.",
    })
    expect(content.success).toBe(true)
  })

  test("validates action:approval_required event", () => {
    const approval = agentEventSchema.safeParse({
      type: "action:approval_required",
      approvalId: "appr-456",
      toolName: "send_proposal",
      args: { documentId: "doc-123", recipientEmail: "client@acme.com" },
      summary: "Send Proposal to client@acme.com",
      expiresAt: "2026-08-18T18:00:00.000Z",
    })
    expect(approval.success).toBe(true)
  })

  test("validates turn:completed with token usage", () => {
    const completed = agentEventSchema.safeParse({
      type: "turn:completed",
      totalSteps: 3,
      usage: {
        promptTokens: 1420,
        completionTokens: 380,
        totalTokens: 1800,
        cachedPromptTokens: 1200,
      },
    })
    expect(completed.success).toBe(true)
  })

  test("formatServerSentEvent produces valid SSE format", () => {
    const sse = formatServerSentEvent({
      type: "content:delta",
      text: "Hello",
    })
    expect(sse).toBe(
      'event: content:delta\ndata: {"type":"content:delta","text":"Hello"}\n\n'
    )
  })
})
