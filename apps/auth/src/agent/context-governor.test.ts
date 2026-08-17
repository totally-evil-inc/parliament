import { describe, expect, test } from "bun:test"
import { ContextGovernor } from "./context-governor"

describe("ContextGovernor Unit Tests", () => {
  test("sliding window compacts conversation turns and retains initial goal", () => {
    const governor = new ContextGovernor({ maxInlineToolChars: 4800, slidingWindowTurns: 2 })
    const messages: any[] = [
      { role: "user", content: "Initial project goal: Build invoicing portal" },
      { role: "assistant", content: "Got it, checking deals..." },
      { role: "user", content: "Turn 1 question" },
      { role: "assistant", content: "Turn 1 answer" },
      { role: "user", content: "Turn 2 question" },
      { role: "assistant", content: "Turn 2 answer" },
      { role: "user", content: "Turn 3 question" },
      { role: "assistant", content: "Turn 3 answer" },
    ]

    const compacted = governor.compactMessages(messages)
    expect(compacted[0].content).toBe("Initial project goal: Build invoicing portal")
    expect(compacted.length).toBeLessThanOrEqual(5)
  })

  test("does not compact messages within sliding window limit", () => {
    const governor = new ContextGovernor({ maxInlineToolChars: 4800, slidingWindowTurns: 5 })
    const messages: any[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ]

    const result = governor.compactMessages(messages)
    expect(result).toHaveLength(2)
  })
})
