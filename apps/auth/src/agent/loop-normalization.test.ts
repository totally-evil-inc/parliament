import { describe, expect, test } from "bun:test"
import { convertMessagesToModelMessages } from "@tanstack/ai"
import { createOpenaiChatCompletions } from "@tanstack/ai-openai"
import {
  normalizeMessagesForAI,
  sanitizeMessagesForAI,
  sanitizeStreamChunk,
} from "./loop"
import { patchAdapterForSafety } from "./provider"

describe("normalizeMessagesForAI", () => {
  test("guarantees parts array is never undefined", () => {
    const rawMessages = [
      { id: "1", role: "user", content: "Hello" }, // no parts property
      { id: "2", role: "assistant", parts: undefined, content: "Hi" }, // parts is undefined
      { id: "3", role: "user", parts: [{ type: "text", text: "Yo" }] }, // text only
      {
        id: "4",
        role: "user",
        parts: [{ type: "text", content: "What happened?" }],
      }, // content only
      {
        id: "5",
        role: "assistant",
        parts: [
          {
            type: "tool-call",
            id: "tc_1",
            name: "gmail_create_draft",
            arguments: "{}",
          },
        ],
      },
    ]

    const normalized = normalizeMessagesForAI(rawMessages) as any[]
    expect(normalized).toHaveLength(5)

    for (const msg of normalized) {
      expect(Array.isArray(msg.parts)).toBe(true)
      expect(msg.parts).not.toBeUndefined()
      expect(msg.content !== undefined).toBe(true)
      expect(msg.content === null || typeof msg.content === "string").toBe(true)
    }

    expect(normalized[0].parts[0]).toMatchObject({
      type: "text",
      text: "Hello",
      content: "Hello",
    })
    expect(normalized[2].parts[0]).toMatchObject({
      type: "text",
      text: "Yo",
      content: "Yo",
    })
    expect(normalized[3].parts[0]).toMatchObject({
      type: "text",
      text: "What happened?",
      content: "What happened?",
    })
    expect(normalized[4].parts[0]).toMatchObject({
      type: "tool-call",
      id: "tc_1",
      name: "gmail_create_draft",
    })
    expect(normalized[4].content).toBeNull()
  })

  test("handles empty or malformed inputs safely", () => {
    expect(normalizeMessagesForAI(null as any)).toEqual([])
    expect(normalizeMessagesForAI(undefined as any)).toEqual([])
    expect(normalizeMessagesForAI([null, undefined, "not-an-obj"])).toEqual([])
  })

  test("produces provider-safe messages after a questionnaire tool turn", () => {
    const normalized = normalizeMessagesForAI([
      { role: "user", parts: [{ type: "text", text: "Draft a proposal" }] },
      {
        role: "assistant",
        parts: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "ask_clarifying_questions",
            args: { title: "Requirements" },
          },
          // Older clients sent only result/output for this part.
          { type: "tool-result", toolCallId: "call-1", result: undefined },
        ],
      },
      { role: "user", content: "Budget: 25000" },
    ]) as any[]

    const modelMessages = convertMessagesToModelMessages(normalized as any)
    const adapter = patchAdapterForSafety(
      createOpenaiChatCompletions("openai/gpt-4o" as any, "dummy-key", {
        baseURL: "https://example.com",
      }) as any
    ) as any

    expect(() =>
      modelMessages.map((message) => adapter.convertMessage(message))
    ).not.toThrow()
    expect(
      modelMessages.find((message: any) => message.role === "tool")?.content
    ).toBe("{}")
  })

  test("normalizes multi-turn tool-calls and tool-results with dual property mapping", () => {
    const rawTurnMessages = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Draft a proposal" }],
      },
      {
        id: "asst-1",
        role: "assistant",
        parts: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "ask_clarifying_questions",
            args: { title: "Proposal Requirements" },
          },
          {
            type: "tool-result",
            toolCallId: "call-1",
            result: { status: "awaiting_user_input" },
          },
        ],
      },
      {
        id: "user-2",
        role: "user",
        content:
          "**Clarifying Answers for Proposal Requirements**:\n- Scope: Web dev",
      },
      {
        id: "asst-2",
        role: "assistant",
        parts: [
          {
            type: "tool-call",
            toolCallId: "call-2",
            toolName: "gmail_create_draft",
            args: { to: "test@example.com" },
          },
          {
            type: "tool-result",
            toolCallId: "call-2",
            result: {
              error: "Request had insufficient authentication scopes.",
            },
          },
          {
            type: "text",
            text: "This function requires higher-level Gmail API access.",
          },
        ],
      },
      {
        id: "user-3",
        role: "user",
        parts: [{ type: "text", text: "Proceed anyway" }],
      },
    ]

    const normalized = normalizeMessagesForAI(rawTurnMessages) as any[]
    expect(normalized).toHaveLength(5)

    // Check Assistant 1 tool call part
    const asst1Tc = normalized[1].parts[0]
    expect(asst1Tc.id).toBe("call-1")
    expect(asst1Tc.toolCallId).toBe("call-1")
    expect(asst1Tc.name).toBe("ask_clarifying_questions")
    expect(asst1Tc.state).toBe("input-complete")
    expect(typeof asst1Tc.arguments).toBe("string")

    // Check Assistant 1 tool result part
    const asst1Tr = normalized[1].parts[1]
    expect(asst1Tr.id).toBe("call-1")
    expect(asst1Tr.toolCallId).toBe("call-1")
    expect(asst1Tr.state).toBe("complete")
    expect(typeof asst1Tr.content).toBe("string")
    expect(JSON.parse(asst1Tr.content)).toEqual({
      status: "awaiting_user_input",
    })

    // Check Assistant 2 parts
    expect(normalized[3].content).toBe(
      "This function requires higher-level Gmail API access."
    )
    const asst2Tr = normalized[3].parts[1]
    expect(asst2Tr.toolCallId).toBe("call-2")
    expect(asst2Tr.content).toContain("insufficient authentication scopes")
  })
})

describe("sanitizeStreamChunk", () => {
  test("never emits undefined tool-result content to the client", () => {
    expect(
      sanitizeStreamChunk({
        type: "TOOL_CALL_RESULT",
        toolCallId: "gmail-1",
        content: undefined,
      } as any)
    ).toMatchObject({ content: "{}" })
    expect(
      sanitizeStreamChunk({
        type: "MESSAGES_SNAPSHOT",
        messages: undefined,
      } as any)
    ).toMatchObject({ messages: [] })
  })
})

describe("sanitizeMessagesForAI", () => {
  test("enforces parts/content invariants for clarification continuation", () => {
    const messages = sanitizeMessagesForAI([
      { role: "user", content: "Draft a proposal", parts: undefined },
      {
        role: "assistant",
        parts: [
          undefined,
          {
            type: "tool-call",
            id: "q1",
            name: "ask_clarifying_questions",
            args: { questions: [] },
          },
          { type: "tool-result", toolCallId: "q1", result: undefined },
          { type: "future-part", data: 1 },
        ],
      },
      {
        role: "user",
        content: "Scope: e-commerce website",
        parts: [undefined],
      },
      { role: "assistant", content: undefined, parts: undefined },
    ])

    expect(messages).toHaveLength(4)
    for (const message of messages) {
      expect(Array.isArray(message.parts)).toBe(true)
      expect(
        message.content === null || typeof message.content === "string"
      ).toBe(true)
      expect(
        message.parts.every((part) => part && typeof part === "object")
      ).toBe(true)
    }
    expect(messages[0]?.parts[0]).toMatchObject({ type: "text" })
    expect(messages[1]?.parts).toHaveLength(2)
    expect(messages[1]?.parts[1]).toMatchObject({
      type: "tool-result",
      toolCallId: "q1",
      content: "{}",
    })
  })

  test("drops malformed user messages instead of passing undefined to providers", () => {
    expect(sanitizeMessagesForAI([{ role: "user", parts: undefined }])).toEqual(
      []
    )
    expect(
      sanitizeMessagesForAI([{ role: "user", parts: [null, 42] }])
    ).toEqual([])
  })
})

describe("patchAdapterForSafety", () => {
  test("prevents Cannot read properties of undefined (reading 'filter') in extractTextContent", () => {
    const rawAdapter = createOpenaiChatCompletions(
      "openai/gpt-4o" as any,
      "dummy-key",
      { baseURL: "https://example.com" }
    )

    const adapter = patchAdapterForSafety(rawAdapter as any) as any

    // Test extractTextContent with all problematic inputs
    expect(adapter.extractTextContent(undefined)).toBe("")
    expect(adapter.extractTextContent(null)).toBe("")
    expect(adapter.extractTextContent("already text")).toBe("already text")
    expect(adapter.normalizeContent(undefined)).toEqual([])
    expect(adapter.normalizeContent(null)).toEqual([])
    expect(
      adapter.normalizeContent([undefined, { type: "text", content: "ok" }])
    ).toEqual([{ type: "text", content: "ok" }])
    expect(adapter.extractTextContent(123 as any)).toBe("")
    expect(adapter.extractTextContent({} as any)).toBe("")
    expect(
      adapter.extractTextContent([
        { type: "text", content: "Hello " },
        { type: "image", source: { type: "url", value: "http://..." } },
        { type: "text", content: "World" },
      ])
    ).toBe("Hello World")
  })

  test("safely converts assistant and tool messages without throwing", () => {
    const rawAdapter = createOpenaiChatCompletions(
      "openai/gpt-4o" as any,
      "dummy-key",
      { baseURL: "https://example.com" }
    )

    const adapter = patchAdapterForSafety(rawAdapter as any) as any

    // Assistant message with undefined content (the exact error condition)
    const assistantMsgWithoutContent = {
      role: "assistant",
      content: undefined,
      toolCalls: [
        {
          id: "call-1",
          type: "function",
          function: { name: "test_tool", arguments: "{}" },
        },
      ],
    }

    const convertedAsst = adapter.convertMessage(assistantMsgWithoutContent)
    expect(convertedAsst.role).toBe("assistant")
    expect(convertedAsst.content).toBeNull()
    expect(convertedAsst.tool_calls).toHaveLength(1)

    // Tool message with undefined content
    const toolMsgWithoutContent = {
      role: "tool",
      toolCallId: "call-1",
      content: undefined,
    }

    const convertedTool = adapter.convertMessage(toolMsgWithoutContent)
    expect(convertedTool.role).toBe("tool")
    expect(convertedTool.tool_call_id).toBe("call-1")
  })
})
