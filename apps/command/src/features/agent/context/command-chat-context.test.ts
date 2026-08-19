import { describe, expect, test } from "bun:test"
import type { AgentEvent } from "@workspace/agent"
import {
  applyEventsToMessages,
  type ChatMessage,
} from "./command-chat-context"

describe("command-chat-context event batch application", () => {
  const baseAssistantMsgId = "asst-1"
  const initialMessages: ChatMessage[] = [
    {
      id: "user-1",
      role: "user",
      content: "Generate proposal and schedule email",
    },
    {
      id: baseAssistantMsgId,
      role: "assistant",
      content: "",
      toolCalls: [],
    },
  ]

  test("applies text and thinking deltas progressively", () => {
    const events: AgentEvent[] = [
      { type: "thinking:delta", text: "Analyzing request..." },
      { type: "thinking:delta", text: " Plan established." },
      { type: "content:delta", text: "I will help " },
      { type: "content:delta", text: "you with that." },
    ]

    const updated = applyEventsToMessages(
      initialMessages,
      baseAssistantMsgId,
      events
    )

    const asstMsg = updated.find((m) => m.id === baseAssistantMsgId)!
    expect(asstMsg.thinking).toBe("Analyzing request... Plan established.")
    expect(asstMsg.content).toBe("I will help you with that.")
  })

  test("records tool execution lifecycle correctly", () => {
    const executedTools = new Set<string>()
    const events: AgentEvent[] = [
      {
        type: "tool:called",
        callId: "call-1",
        name: "create_proposal",
        args: { title: "Acme Deal" },
      },
      {
        type: "tool:result",
        callId: "call-1",
        name: "create_proposal",
        result: { proposalId: "prop-123" },
        isError: false,
      },
    ]

    const updated = applyEventsToMessages(
      initialMessages,
      baseAssistantMsgId,
      events,
      executedTools
    )

    const asstMsg = updated.find((m) => m.id === baseAssistantMsgId)!
    expect(asstMsg.toolCalls).toHaveLength(1)
    expect(asstMsg.toolCalls![0]).toMatchObject({
      id: "call-1",
      name: "create_proposal",
      status: "completed",
      result: { proposalId: "prop-123" },
    })
    expect(executedTools.has("create_proposal")).toBe(true)
  })

  test("handles client-initiated turn:error aborted event cleanly without error card", () => {
    const messagesWithRunningTool: ChatMessage[] = [
      {
        id: baseAssistantMsgId,
        role: "assistant",
        content: "Drafting...",
        toolCalls: [
          {
            id: "call-running",
            name: "heavy_task",
            status: "running",
          },
        ],
      },
    ]

    const abortEvents: AgentEvent[] = [
      {
        type: "turn:error",
        code: "aborted",
        message: "Agent turn was aborted by client request.",
        recoverable: false,
      },
    ]

    const updated = applyEventsToMessages(
      messagesWithRunningTool,
      baseAssistantMsgId,
      abortEvents
    )

    const asstMsg = updated.find((m) => m.id === baseAssistantMsgId)!
    // Running tool should be suspended, not error
    expect(asstMsg.toolCalls![0].status).toBe("suspended")
    // Message error should NOT be populated for intentional aborts
    expect(asstMsg.error).toBeUndefined()
  })

  test("records authentic turn:error events with error card and tool error state", () => {
    const messagesWithRunningTool: ChatMessage[] = [
      {
        id: baseAssistantMsgId,
        role: "assistant",
        content: "Working...",
        toolCalls: [
          {
            id: "call-running",
            name: "failing_task",
            status: "running",
          },
        ],
      },
    ]

    const errorEvents: AgentEvent[] = [
      {
        type: "turn:error",
        code: "rate_limit_exceeded",
        message: "API rate limit reached. Please retry shortly.",
        recoverable: true,
      },
    ]

    const updated = applyEventsToMessages(
      messagesWithRunningTool,
      baseAssistantMsgId,
      errorEvents
    )

    const asstMsg = updated.find((m) => m.id === baseAssistantMsgId)!
    expect(asstMsg.toolCalls![0].status).toBe("error")
    expect(asstMsg.error).toEqual({
      code: "rate_limit_exceeded",
      message: "API rate limit reached. Please retry shortly.",
    })
  })

  test("handles empty events array defensively", () => {
    const updated = applyEventsToMessages(
      initialMessages,
      baseAssistantMsgId,
      []
    )
    expect(updated).toBe(initialMessages)
  })
})
