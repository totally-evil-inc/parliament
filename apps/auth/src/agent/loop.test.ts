import { describe, expect, test } from "bun:test"
import { convertToModelMessages } from "./loop"

describe("convertToModelMessages for AI SDK 7 ModelMessage format", () => {
  test("correctly formats user text messages", () => {
    const raw = [
      { role: "user", content: "How is my pipeline looking this month?" },
    ]
    const converted = convertToModelMessages(raw)
    expect(converted).toEqual([
      { role: "user", content: "How is my pipeline looking this month?" },
    ])
  })

  test("correctly formats assistant tool-call and tool-result parts to AI SDK 7 schema", () => {
    const raw = [
      { role: "user", content: "How is my pipeline looking this month?" },
      {
        role: "assistant",
        parts: [
          {
            type: "thinking",
            thinking: "I will check the deal analytics tool.",
          },
          {
            type: "tool-call",
            toolCallId: "call-123",
            toolName: "deal_analytics",
            args: {},
          },
          {
            type: "tool-result",
            toolCallId: "call-123",
            toolName: "deal_analytics",
            result: { totalPipelineValue: 1500000 },
          },
        ],
      },
    ]

    const converted = convertToModelMessages(raw)

    // In AI SDK 7:
    // Assistant message contains tool-call part with `input`
    // Tool message contains tool-result part with `output: { type: "text", value: "..." }`
    expect(converted.length).toBe(3)
    expect(converted[0]).toEqual({
      role: "user",
      content: "How is my pipeline looking this month?",
    })

    expect(converted[1]).toEqual({
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "call-123",
          toolName: "deal_analytics",
          input: {},
        },
      ],
    })

    expect(converted[2]).toEqual({
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "call-123",
          toolName: "deal_analytics",
          output: {
            type: "text",
            value: JSON.stringify({ totalPipelineValue: 1500000 }),
          },
        },
      ],
    })
  })

  test("handles error tool-results with error-text output type", () => {
    const raw = [
      {
        role: "assistant",
        parts: [
          {
            type: "tool-result",
            toolCallId: "call-err",
            toolName: "deal_analytics",
            result: "Internal tool failure",
            isError: true,
          },
        ],
      },
    ]

    const converted = convertToModelMessages(raw)
    expect(converted[0]).toEqual({
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "call-err",
          toolName: "deal_analytics",
          output: {
            type: "error-text",
            value: "Internal tool failure",
          },
        },
      ],
    })
  })

  test("preserves chronological interleaving of text, tool calls, and subsequent narration", () => {
    const raw = [
      {
        role: "assistant",
        parts: [
          { type: "text", text: "Checking your active deals now..." },
          {
            type: "tool-call",
            toolCallId: "call-deals",
            toolName: "list_deals",
            args: { limit: 5 },
          },
          {
            type: "tool-result",
            toolCallId: "call-deals",
            toolName: "list_deals",
            result: [{ id: "deal-1", title: "Enterprise Pilot" }],
          },
          {
            type: "text",
            text: "You have 1 active deal in your pipeline.",
          },
        ],
      },
    ]

    const converted = convertToModelMessages(raw)
    expect(converted).toHaveLength(3)

    // Message 1: Preceding narration + tool-call
    expect(converted[0]).toEqual({
      role: "assistant",
      content: [
        { type: "text", text: "Checking your active deals now..." },
        {
          type: "tool-call",
          toolCallId: "call-deals",
          toolName: "list_deals",
          input: { limit: 5 },
        },
      ],
    })

    // Message 2: Tool execution result
    expect(converted[1]).toEqual({
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "call-deals",
          toolName: "list_deals",
          output: {
            type: "text",
            value: JSON.stringify([{ id: "deal-1", title: "Enterprise Pilot" }]),
          },
        },
      ],
    })

    // Message 3: Post-execution explanation
    expect(converted[2]).toEqual({
      role: "assistant",
      content: [
        {
          type: "text",
          text: "You have 1 active deal in your pipeline.",
        },
      ],
    })
  })
})
