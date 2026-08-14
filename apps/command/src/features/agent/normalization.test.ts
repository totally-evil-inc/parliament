import { describe, expect, test } from "bun:test"
import { normalizeAssistantMessage } from "./normalization"

describe("normalizeAssistantMessage", () => {
  test("extracts ask_clarifying_questions tool calls and arguments from parts", () => {
    const rawMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "To tailor your proposal accurately, please answer a few quick questions:",
        },
        {
          type: "tool-call",
          id: "tc-clarify-1",
          name: "ask_clarifying_questions",
          arguments: JSON.stringify({
            title: "Web Development Proposal Requirements",
            subtitle: "Please provide the following project details",
            questions: [
              {
                id: "scope",
                question: "What is the primary project scope?",
                type: "single_choice",
                options: ["Custom Web App", "Marketing Site"],
              },
            ],
          }),
        },
        {
          type: "tool-result",
          toolCallId: "tc-clarify-1",
          result: { status: "awaiting_user_input", questionsCount: 1 },
        },
      ],
    }

    const normalized = normalizeAssistantMessage(rawMessage)
    // The questionnaire widget is the sole rendering of its questions; prose
    // duplicates are intentionally suppressed.
    expect(normalized.text).toBe("")
    expect(normalized.tools).toHaveLength(1)
    expect(normalized.tools[0].id).toBe("tc-clarify-1")
    expect(normalized.tools[0].name).toBe("ask_clarifying_questions")
    expect(normalized.tools[0].status).toBe("completed")
    expect((normalized.tools[0].args as any).title).toBe(
      "Web Development Proposal Requirements"
    )
    expect((normalized.tools[0].args as any).questions).toHaveLength(1)
  })

  test("preserves approval metadata for the HITL action handlers", () => {
    const normalized = normalizeAssistantMessage({
      role: "assistant",
      parts: [
        {
          type: "tool-call",
          id: "call-send",
          name: "gmail_send_email",
          arguments: '{"to":"client@example.com"}',
          state: "approval-requested",
          approval: { id: "approval-1", needsApproval: true },
        },
      ],
    })

    expect(normalized.tools[0]).toMatchObject({
      id: "call-send",
      approvalId: "approval-1",
      needsApproval: true,
      status: "awaiting-approval",
    })
  })

  test("recovers title and subtitle from partial streaming JSON arguments", () => {
    const rawMessage = {
      id: "msg-stream",
      role: "assistant",
      parts: [
        {
          type: "tool-call",
          id: "tc-stream-1",
          name: "ask_clarifying_questions",
          arguments:
            '{"title":"Web Development Proposal Requirements","subtitle":"Please provide details","questions":[{"id":"scope"',
        },
      ],
    }

    const normalized = normalizeAssistantMessage(rawMessage)
    expect(normalized.tools).toHaveLength(1)
    expect((normalized.tools[0].args as any).title).toBe(
      "Web Development Proposal Requirements"
    )
    expect((normalized.tools[0].args as any).subtitle).toBe(
      "Please provide details"
    )
  })
})
