import { describe, expect, it } from "bun:test"
import {
  conversationDetailResponseSchema,
  conversationListResponseSchema,
  conversationSummarySchema,
} from "./use-agent-conversations"

describe("use-agent-conversations schemas", () => {
  it("normalizes conversation summary with default pinned false", () => {
    const raw = {
      id: "conv-123",
      title: "Test Chat",
      model: "anthropic/claude-sonnet-4",
      updatedAt: "2026-08-19T12:00:00.000Z",
      messageCount: 5,
    }

    const parsed = conversationSummarySchema.parse(raw)
    expect(parsed.id).toBe("conv-123")
    expect(parsed.pinned).toBe(false)
    expect(parsed.messageCount).toBe(5)
  })

  it("parses pinned conversation correctly", () => {
    const raw = {
      id: "conv-456",
      title: "Pinned Chat",
      model: null,
      pinned: true,
      updatedAt: "2026-08-19T12:00:00.000Z",
      messageCount: 12,
    }

    const parsed = conversationSummarySchema.parse(raw)
    expect(parsed.id).toBe("conv-456")
    expect(parsed.pinned).toBe(true)
    expect(parsed.model).toBeNull()
  })

  it("handles conversation list response with multiple conversations", () => {
    const raw = {
      conversations: [
        {
          id: "c-1",
          title: "First",
          updatedAt: "2026-08-19T12:00:00.000Z",
          messageCount: 2,
        },
        {
          id: "c-2",
          title: "Second",
          pinned: true,
          updatedAt: "2026-08-19T12:05:00.000Z",
          messageCount: 8,
        },
      ],
    }

    const parsed = conversationListResponseSchema.parse(raw)
    expect(parsed.conversations).toHaveLength(2)
    expect(parsed.conversations[0].pinned).toBe(false)
    expect(parsed.conversations[1].pinned).toBe(true)
  })

  it("parses conversation detail response with messages", () => {
    const raw = {
      conversation: {
        id: "c-100",
        title: "Thread Detail",
        pinned: false,
        updatedAt: "2026-08-19T12:00:00.000Z",
        messageCount: 1,
      },
      messages: [
        {
          id: "m-1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
          status: "complete",
          createdAt: "2026-08-19T12:00:00.000Z",
        },
      ],
    }

    const parsed = conversationDetailResponseSchema.parse(raw)
    expect(parsed.conversation.id).toBe("c-100")
    expect(parsed.messages).toHaveLength(1)
    expect(parsed.messages[0].role).toBe("user")
  })
})
