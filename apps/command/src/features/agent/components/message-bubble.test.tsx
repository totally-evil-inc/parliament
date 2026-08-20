import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { MessageBubble } from "./message-bubble"

describe("MessageBubble Component", () => {
  test("renders user message bubble on the right", () => {
    const html = renderToString(
      <MessageBubble
        message={{
          id: "msg-1",
          role: "user",
          content: "Draft a proposal for Acme Corp",
        }}
      />
    )

    expect(html).toContain("Draft a proposal for Acme Corp")
    expect(html).toContain("justify-end")
  })

  test("renders assistant turn with agent avatar and activity rail", () => {
    const html = renderToString(
      <MessageBubble
        message={{
          id: "msg-2",
          role: "assistant",
          thinking: "Reviewing company deals and existing pricing…",
          content: "I have prepared the proposal for Acme Corp below.",
          tasks: [
            {
              title: "Proposal Synthesis",
              status: "completed",
              items: [{ text: "Extract parameters", status: "completed" }],
            },
          ],
          toolCalls: [
            {
              id: "tc-1",
              name: "create_proposal",
              args: { title: "Acme Consultation", totalMinorUnits: 500000 },
              status: "completed",
            },
          ],
        }}
      />
    )

    expect(html).toContain("Parliament Agent")
    expect(html).toContain("Proposal Synthesis")
    expect(html).toContain("Drafting commercial proposal")
    expect(html).toContain("I have prepared the proposal for Acme Corp below.")
  })

  test("renders inline pending approval prominently within assistant turn", () => {
    const html = renderToString(
      <MessageBubble
        message={{
          id: "msg-3",
          role: "assistant",
          content: "Please review and authorize sending this proposal.",
          toolCalls: [
            {
              id: "tc-2",
              name: "send_proposal",
              args: {
                recipientEmail: "ceo@acme.com",
                totalMinorUnits: 500000,
                proposalId: "p-99",
              },
              needsApproval: true,
              approvalId: "appr-999",
              status: "pending_approval",
            },
          ],
        }}
      />
    )

    expect(html).toContain("Send Proposal")
    expect(html).toContain("ceo@acme.com")
    expect(html).toContain("Approve Action")
    expect(html).toContain("Reject")
  })

  test("renders error card with retry when assistant turn has an error", () => {
    const html = renderToString(
      <MessageBubble
        message={{
          id: "msg-4",
          role: "assistant",
          content: "",
          error: {
            code: "context_overflow",
            message: "Context window exceeded budget limit.",
          },
        }}
      />
    )

    expect(html).toContain("Context window exceeded budget limit.")
  })

  test("renders active processing indicator only for running tools, not completed or suspended", () => {
    // 1. Running tool: should have "Running" badge
    const runningHtml = renderToString(
      <MessageBubble
        message={{
          id: "msg-running",
          role: "assistant",
          content: "",
          toolCalls: [
            {
              id: "tc-run",
              name: "list_deals",
              status: "running",
            },
          ],
        }}
        isStreaming={true}
      />
    )
    expect(runningHtml).toContain("Running")
    expect(runningHtml).toContain("Reviewing pipeline deals")

    // 2. Completed tool: should NOT show "Running"
    const completedHtml = renderToString(
      <MessageBubble
        message={{
          id: "msg-completed",
          role: "assistant",
          content: "Here are the deals.",
          toolCalls: [
            {
              id: "tc-comp",
              name: "list_deals",
              status: "completed",
              result: [{ id: "deal-1" }],
            },
          ],
        }}
        isStreaming={false}
      />
    )
    expect(completedHtml).not.toContain("Running")

    // 3. Suspended tool (aborted): should NOT show "Running"
    const suspendedHtml = renderToString(
      <MessageBubble
        message={{
          id: "msg-suspended",
          role: "assistant",
          content: "Stopped.",
          toolCalls: [
            {
              id: "tc-susp",
              name: "list_deals",
              status: "suspended",
            },
          ],
        }}
        isStreaming={false}
      />
    )
    expect(suspendedHtml).not.toContain("Running")
  })
})

