import { describe, expect, test } from "bun:test"
import {
  normalizeAssistantMessage,
  stripLeakedFunctionCalls,
} from "./normalization"

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

  test("extracts thinking, chain of thought, and tasks when present", () => {
    const rawMessage = {
      id: "msg-complex",
      role: "assistant",
      parts: [
        {
          type: "thinking",
          thinking: "Evaluating sales pipeline and draft proposals...",
        },
        {
          type: "text",
          text: "Here is the summary of your pipeline.",
        },
      ],
      chainOfThought: [
        {
          label: "Query CRM deals",
          description: "Fetched active deals for Q3",
          status: "complete",
          searchResults: ["deals/q3"],
        },
      ],
      tasks: [
        {
          title: "Proposal dispatch workflow",
          status: "in_progress",
          items: [{ text: "Created draft", status: "completed" }],
        },
      ],
    }

    const normalized = normalizeAssistantMessage(rawMessage)
    expect(normalized.text).toBe("Here is the summary of your pipeline.")
    expect(normalized.thinking).toBe(
      "Evaluating sales pipeline and draft proposals..."
    )
    expect(normalized.chainOfThought).toHaveLength(1)
    expect(normalized.chainOfThought?.[0].label).toBe("Query CRM deals")
    expect(normalized.tasks).toHaveLength(1)
    expect(normalized.tasks?.[0].title).toBe("Proposal dispatch workflow")
  })

  test("extracts <think>...</think> reasoning tags from text", () => {
    const rawMessage = {
      id: "msg-think",
      role: "assistant",
      content:
        "<think>Checking deal stages and CRM pipeline.</think>Here are your deals.",
    }

    const normalized = normalizeAssistantMessage(rawMessage)
    expect(normalized.thinking).toBe("Checking deal stages and CRM pipeline.")
    expect(normalized.text).toBe("Here are your deals.")
  })

  test("extracts unclosed <think> reasoning tags during active stream", () => {
    const rawMessage = {
      id: "msg-stream-think",
      role: "assistant",
      content: "<think>Currently analyzing deal milestones and",
    }

    const normalized = normalizeAssistantMessage(rawMessage)
    expect(normalized.thinking).toBe("Currently analyzing deal milestones and")
    expect(normalized.text).toBe("")
  })

  test("strips leaked markdown pseudo-function-call text from assistant messages", () => {
    const leakedRawText = `I can help manage your sales pipeline and draft proposals.

Here is a JSON for a function call with its proper arguments that best answers the given prompt:
\`\`\`
{"name": "verify_org_access", "parameters": {}}
\`\`\`
This function call will verify which organization the current session belongs to and return the organization id and name.`

    const sanitized = stripLeakedFunctionCalls(leakedRawText)
    expect(sanitized).toBe(
      "I can help manage your sales pipeline and draft proposals."
    )

    const normalized = normalizeAssistantMessage({
      role: "assistant",
      content: leakedRawText,
    })
    expect(normalized.text).toBe(
      "I can help manage your sales pipeline and draft proposals."
    )
  })
})
