import { describe, expect, test } from "bun:test"
import type { AgentEvent } from "@workspace/agent"
import {
  applyEventsToMessages,
  type ChatMessage,
  parseSseChunk,
  parseSseTrailingBuffer,
  reconcileTerminalTurn,
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

  test("deduplicates duplicate tool:called events with the same callId without duplicating cards", () => {
    const events: AgentEvent[] = [
      {
        type: "tool:called",
        callId: "call-dup-1",
        name: "search_contacts",
        args: { query: "John" },
      },
      // Duplicate event for same callId
      {
        type: "tool:called",
        callId: "call-dup-1",
        name: "search_contacts",
        args: { query: "John Doe" },
      },
    ]

    const updated = applyEventsToMessages(
      initialMessages,
      baseAssistantMsgId,
      events
    )

    const asst = updated.find((m) => m.id === baseAssistantMsgId)!
    expect(asst.toolCalls).toHaveLength(1)
    expect(asst.toolCalls![0].id).toBe("call-dup-1")
    expect(asst.toolCalls![0].args).toEqual({ query: "John Doe" })
  })

  test("latches terminal state so late content, late tool errors, or duplicate turn:error cannot mutate a completed turn", () => {
    const events: AgentEvent[] = [
      {
        type: "content:delta",
        text: "Here is your proposal summary.",
      },
      {
        type: "tool:called",
        callId: "call-done",
        name: "create_proposal",
        args: {},
      },
      {
        type: "turn:completed",
        totalSteps: 1,
      },
      // Late events delivered after turn completion
      {
        type: "content:delta",
        text: " Extra unwanted text.",
      },
      {
        type: "turn:error",
        code: "network_drop",
        message: "Late network error",
        recoverable: false,
      },
    ]

    const updated = applyEventsToMessages(
      initialMessages,
      baseAssistantMsgId,
      events
    )

    const asst = updated.find((m) => m.id === baseAssistantMsgId)!
    // Content should NOT contain the late delta
    expect(asst.content).toBe("Here is your proposal summary.")
    // Turn error should NOT be populated from late turn:error
    expect(asst.error).toBeUndefined()
    // Message should be marked terminal
    expect(asst.isTerminal).toBe(true)

    // And subsequent batches targeting this assistant message are ignored
    const lateBatch: AgentEvent[] = [
      {
        type: "content:delta",
        text: "More late text",
      },
    ]
    const afterLateBatch = applyEventsToMessages(
      updated,
      baseAssistantMsgId,
      lateBatch
    )
    const asstLate = afterLateBatch.find((m) => m.id === baseAssistantMsgId)!
    expect(asstLate.content).toBe("Here is your proposal summary.")
  })

  test("collapses superseded failed tool attempts when a retry succeeds", () => {
    // Attempt 1: create_deal fails
    const step1Events: AgentEvent[] = [
      {
        type: "tool:called",
        callId: "call-1",
        name: "create_deal",
        args: { name: "Alpha Corp" },
        attempt: 1,
      },
      {
        type: "tool:result",
        callId: "call-1",
        name: "create_deal",
        isError: true,
        result: { error: "Database lock conflict" },
        attempt: 1,
      },
    ]

    const afterStep1 = applyEventsToMessages(
      initialMessages,
      baseAssistantMsgId,
      step1Events
    )
    const asst1 = afterStep1.find((m) => m.id === baseAssistantMsgId)!
    expect(asst1.toolCalls).toHaveLength(1)
    expect(asst1.toolCalls![0].status).toBe("error")
    expect(asst1.toolCalls![0].id).toBe("call-1")

    // Attempt 2: retry of call-1 succeeds
    const step2Events: AgentEvent[] = [
      {
        type: "tool:called",
        callId: "call-2",
        name: "create_deal",
        args: { name: "Alpha Corp" },
        retryOf: "call-1",
        attempt: 2,
      },
      {
        type: "tool:result",
        callId: "call-2",
        name: "create_deal",
        isError: false,
        result: { dealId: "deal-101" },
        retryOf: "call-1",
        attempt: 2,
      },
    ]

    const afterStep2 = applyEventsToMessages(
      afterStep1,
      baseAssistantMsgId,
      step2Events
    )
    const asst2 = afterStep2.find((m) => m.id === baseAssistantMsgId)!
    // The failed attempt call-1 is collapsed/removed, leaving only the successful call-2
    expect(asst2.toolCalls).toHaveLength(1)
    expect(asst2.toolCalls![0].id).toBe("call-2")
    expect(asst2.toolCalls![0].status).toBe("completed")
    expect(asst2.toolCalls![0].attempt).toBe(2)
    expect(asst2.toolCalls![0].retryOf).toBe("call-1")
  })

  test("handles multi-attempt retry chains collapsing all intermediate failures", () => {
    // Attempt 1 fails, Attempt 2 fails, Attempt 3 succeeds
    const events: AgentEvent[] = [
      {
        type: "tool:called",
        callId: "call-a1",
        name: "send_email",
        args: {},
        attempt: 1,
      },
      {
        type: "tool:result",
        callId: "call-a1",
        name: "send_email",
        isError: true,
        result: { error: "Network glitch 1" },
        attempt: 1,
      },
      {
        type: "tool:called",
        callId: "call-a2",
        name: "send_email",
        args: {},
        retryOf: "call-a1",
        attempt: 2,
      },
      {
        type: "tool:result",
        callId: "call-a2",
        name: "send_email",
        isError: true,
        result: { error: "Network glitch 2" },
        retryOf: "call-a1",
        attempt: 2,
      },
      {
        type: "tool:called",
        callId: "call-a3",
        name: "send_email",
        args: {},
        retryOf: "call-a2",
        attempt: 3,
      },
      {
        type: "tool:result",
        callId: "call-a3",
        name: "send_email",
        isError: false,
        result: { messageId: "msg-999" },
        retryOf: "call-a2",
        attempt: 3,
      },
    ]

    const updated = applyEventsToMessages(
      initialMessages,
      baseAssistantMsgId,
      events
    )
    const asst = updated.find((m) => m.id === baseAssistantMsgId)!
    expect(asst.toolCalls).toHaveLength(1)
    expect(asst.toolCalls![0].id).toBe("call-a3")
    expect(asst.toolCalls![0].status).toBe("completed")
    expect(asst.toolCalls![0].attempt).toBe(3)
  })

  test("preserves independent tool calls while collapsing retries for specific tools", () => {
    const events: AgentEvent[] = [
      // Independent tool 1 (succeeded)
      {
        type: "tool:called",
        callId: "call-indep-1",
        name: "list_customers",
        args: {},
      },
      {
        type: "tool:result",
        callId: "call-indep-1",
        name: "list_customers",
        isError: false,
        result: [{ id: "cust-1" }],
      },
      // Tool 2 (fails attempt 1)
      {
        type: "tool:called",
        callId: "call-retry-1",
        name: "create_proposal",
        args: { title: "Draft" },
      },
      {
        type: "tool:result",
        callId: "call-retry-1",
        name: "create_proposal",
        isError: true,
        result: { error: "Validation failed" },
      },
      // Tool 2 (succeeds attempt 2)
      {
        type: "tool:called",
        callId: "call-retry-2",
        name: "create_proposal",
        args: { title: "Draft Validated" },
        retryOf: "call-retry-1",
        attempt: 2,
      },
      {
        type: "tool:result",
        callId: "call-retry-2",
        name: "create_proposal",
        isError: false,
        result: { proposalId: "prop-456" },
        retryOf: "call-retry-1",
        attempt: 2,
      },
    ]

    const updated = applyEventsToMessages(
      initialMessages,
      baseAssistantMsgId,
      events
    )
    const asst = updated.find((m) => m.id === baseAssistantMsgId)!
    expect(asst.toolCalls).toHaveLength(2)
    expect(asst.toolCalls!.map((tc) => tc.id)).toEqual([
      "call-indep-1",
      "call-retry-2",
    ])
  })

  test("preserves multiple concurrent calls to the same tool without cross-conflating execution status", () => {
    const events: AgentEvent[] = [
      {
        type: "tool:called",
        callId: "email-1",
        name: "send_email",
        args: { to: "alice@example.com" },
      },
      {
        type: "tool:called",
        callId: "email-2",
        name: "send_email",
        args: { to: "bob@example.com" },
      },
      // Only email-2 receives executing event
      {
        type: "tool:executing",
        callId: "email-2",
        name: "send_email",
      },
      // email-1 receives result
      {
        type: "tool:result",
        callId: "email-1",
        name: "send_email",
        result: { status: "sent" },
        isError: false,
      },
    ]

    const updated = applyEventsToMessages(
      initialMessages,
      baseAssistantMsgId,
      events
    )
    const asst = updated.find((m) => m.id === baseAssistantMsgId)!
    expect(asst.toolCalls).toHaveLength(2)

    const call1 = asst.toolCalls!.find((t) => t.id === "email-1")!
    const call2 = asst.toolCalls!.find((t) => t.id === "email-2")!

    expect(call1.status).toBe("completed")
    expect(call2.status).toBe("running")
  })

  test("reconcileTerminalTurn reconciles unresolved tools cleanly", () => {
    const messages: ChatMessage[] = [
      {
        id: "asst-test",
        role: "assistant",
        content: "Processing...",
        toolCalls: [
          {
            id: "call-running",
            name: "calculate_tax",
            status: "running",
          },
          {
            id: "call-pending",
            name: "generate_pdf",
            status: "pending",
          },
          {
            id: "call-approval",
            name: "send_invoice",
            status: "pending_approval",
            needsApproval: true,
            approvalId: "appr-1",
          },
          {
            id: "call-completed-result",
            name: "fetch_rate",
            result: { rate: 1.25 },
          },
        ],
      },
    ]

    // 1. Reconcile completed
    const completed = reconcileTerminalTurn(messages, "asst-test", "completed")
    const asstComp = completed.find((m) => m.id === "asst-test")!
    expect(asstComp.toolCalls![0].status).toBe("completed")
    expect(asstComp.toolCalls![1].status).toBe("completed")
    // Action approval must remain pending_approval
    expect(asstComp.toolCalls![2].status).toBe("pending_approval")
    expect(asstComp.toolCalls![3].status).toBe("completed")

    // 2. Reconcile suspended (e.g. abort or suspension)
    const suspended = reconcileTerminalTurn(messages, "asst-test", "suspended")
    const asstSusp = suspended.find((m) => m.id === "asst-test")!
    expect(asstSusp.toolCalls![0].status).toBe("suspended")
    expect(asstSusp.toolCalls![1].status).toBe("suspended")
    expect(asstSusp.toolCalls![2].status).toBe("pending_approval")

    // 3. Reconcile error (e.g. transport drop)
    const errored = reconcileTerminalTurn(messages, "asst-test", "error", {
      code: "stream_failed",
      message: "Connection closed unexpectedly",
    })
    const asstErr = errored.find((m) => m.id === "asst-test")!
    expect(asstErr.toolCalls![0].status).toBe("error")
    expect(asstErr.toolCalls![0].errorText).toBe(
      "Connection closed unexpectedly"
    )
    expect(asstErr.toolCalls![1].status).toBe("error")
    expect(asstErr.toolCalls![2].status).toBe("pending_approval")
    expect(asstErr.error).toEqual({
      code: "stream_failed",
      message: "Connection closed unexpectedly",
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

  test("parseSseChunk parses complete blocks and retains incomplete buffer", () => {
    const chunk =
      ': heartbeat\n\nevent: content:delta\ndata: {"type":"content:delta","text":"Hello "}\n\nevent: content:delta\ndata: {"type":"content:delta","text":"World"}\n\nevent: thinking:delta\ndata: {"type":"thin'
    const { events, remainder } = parseSseChunk(chunk)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: "content:delta", text: "Hello " })
    expect(events[1]).toEqual({ type: "content:delta", text: "World" })
    expect(remainder).toBe(
      'event: thinking:delta\ndata: {"type":"thin'
    )
  })

  test("reconcileTerminalTurn reconciles unexpected EOF without terminal event as error", () => {
    const messages: ChatMessage[] = [
      {
        id: "asst-eof",
        role: "assistant",
        content: "Working on it...",
        toolCalls: [
          {
            id: "call-in-flight",
            name: "send_email",
            status: "running",
          },
          {
            id: "call-needs-approval",
            name: "delete_database",
            status: "pending_approval",
            needsApproval: true,
            approvalId: "appr-xyz",
          },
          {
            id: "call-already-done",
            name: "fetch_user",
            status: "completed",
            result: { id: "u-1" },
          },
        ],
      },
    ]

    const reconciled = reconcileTerminalTurn(messages, "asst-eof", "error", {
      code: "stream_interrupted",
      message: "Stream closed unexpectedly before turn completed",
    })

    const asst = reconciled.find((m) => m.id === "asst-eof")!
    // In-flight tool must become error, NOT completed
    expect(asst.toolCalls![0].status).toBe("error")
    expect(asst.toolCalls![0].errorText).toBe(
      "Stream closed unexpectedly before turn completed"
    )
    // Pending approval must remain pending_approval
    expect(asst.toolCalls![1].status).toBe("pending_approval")
    // Completed tool remains completed
    expect(asst.toolCalls![2].status).toBe("completed")
    // Message has turn error
    expect(asst.error).toEqual({
      code: "stream_interrupted",
      message: "Stream closed unexpectedly before turn completed",
    })
  })

  test("parseSseTrailingBuffer flushes valid event lines at stream EOF", () => {
    const trailingBuffer =
      'event: turn:completed\ndata: {"type":"turn:completed","totalSteps":2}'
    const events = parseSseTrailingBuffer(trailingBuffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: "turn:completed", totalSteps: 2 })
  })

  test("TextDecoder stream decode flushes split multi-byte UTF-8 character at EOF without corruption", () => {
    // 4-byte UTF-8 emoji 🚀 is [0xf0, 0x9f, 0x9a, 0x80]
    const fullJson = 'event: content:delta\ndata: {"type":"content:delta","text":"Launch 🚀"}'
    const encoder = new TextEncoder()
    const bytes = encoder.encode(fullJson)

    // Split across the 4-byte sequence
    const splitIndex = bytes.length - 2
    const chunk1 = bytes.slice(0, splitIndex)
    const chunk2 = bytes.slice(splitIndex)

    const decoder = new TextDecoder()
    let buffer = ""
    buffer += decoder.decode(chunk1, { stream: true })
    buffer += decoder.decode(chunk2, { stream: true })
    buffer += decoder.decode() // EOF flush

    const events = parseSseTrailingBuffer(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: "content:delta", text: "Launch 🚀" })
  })
})


