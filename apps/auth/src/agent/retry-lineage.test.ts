import { describe, expect, test } from "bun:test"
import { extractRetryLineage } from "./retry-lineage"

/** Minimal structural type matching the client payload wire shape. */
interface PayloadPart {
  type: string
  text?: string
  toolCallId?: string
  toolName?: string
  args?: unknown
  result?: unknown
  isError?: boolean
  retryOf?: string
  attempt?: number
}

interface PayloadMessage {
  role: string
  content?: string | null
  parts?: PayloadPart[]
}

describe("extractRetryLineage from client payload shape", () => {
  // This mirrors exactly the payload produced by buildPayloadMessages in
  // apps/command after the retry-lineage fix: tool-call and tool-result parts
  // carry retryOf/attempt so resumed/history turns seed the runtime registry.
  test("seeds lineage from client payload tool parts carrying retryOf/attempt", () => {
    const clientPayload: PayloadMessage[] = [
      {
        role: "user",
        content: "Create the deal",
        parts: [{ type: "text", text: "Create the deal" }],
      },
      {
        role: "assistant",
        content: "Retried and succeeded.",
        parts: [
          { type: "text", text: "Retried and succeeded." },
          {
            type: "tool-call",
            toolCallId: "call-retry-success",
            toolName: "create_deal",
            args: { name: "Alpha Corp" },
            retryOf: "call-attempt-1",
            attempt: 2,
          },
          {
            type: "tool-result",
            toolCallId: "call-retry-success",
            toolName: "create_deal",
            result: { dealId: "deal-101" },
            isError: false,
            retryOf: "call-attempt-1",
            attempt: 2,
          },
          {
            type: "tool-call",
            toolCallId: "call-no-lineage",
            toolName: "list_customers",
            args: {},
          },
          {
            type: "tool-result",
            toolCallId: "call-no-lineage",
            toolName: "list_customers",
            result: [],
            isError: false,
          },
        ],
      },
    ]

    const lineage = extractRetryLineage(clientPayload)

    expect(lineage.get("call-retry-success")).toEqual({ attempt: 2 })
    // Default attempt of 1 is registered for lineage-free calls
    expect(lineage.get("call-no-lineage")).toEqual({ attempt: 1 })
  })

  test("invalid attempt values fall back to 1 instead of poisoning the registry", () => {
    const clientPayload: PayloadMessage[] = [
      {
        role: "assistant",
        parts: [
          {
            type: "tool-call",
            toolCallId: "call-bad-attempt",
            toolName: "t",
            args: {},
            attempt: -5,
          },
        ],
      },
    ]

    const lineage = extractRetryLineage(clientPayload)
    expect(lineage.get("call-bad-attempt")).toEqual({ attempt: 1 })
  })
})
