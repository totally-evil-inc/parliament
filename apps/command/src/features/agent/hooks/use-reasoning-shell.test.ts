import { describe, expect, test } from "bun:test"
import {
  deriveReasoningState,
  REASONING_FALLBACK_TEXT,
} from "./use-reasoning-shell"

describe("deriveReasoningState", () => {
  test("idle: collapsed with fallback copy", () => {
    const state = deriveReasoningState({ isLoading: false })

    expect(state.expanded).toBe(false)
    expect(state.phase).toBe("idle")
    expect(state.statusText).toBe(REASONING_FALLBACK_TEXT)
  })

  test("submitting: expanded before any reasoning text has streamed", () => {
    const state = deriveReasoningState({ isLoading: true, thinking: "   " })

    expect(state.expanded).toBe(true)
    expect(state.phase).toBe("submitting")
    expect(state.statusText).toBe(REASONING_FALLBACK_TEXT)
  })

  test("reasoning: expanded and showing trimmed live thinking", () => {
    const state = deriveReasoningState({
      isLoading: true,
      thinking: "  comparing deal stages across the pipeline…  ",
    })

    expect(state.expanded).toBe(true)
    expect(state.phase).toBe("reasoning")
    expect(state.statusText).toBe("comparing deal stages across the pipeline…")
  })

  test("completed: run finished, strip collapses", () => {
    const state = deriveReasoningState({
      isLoading: false,
      thinking: "done reasoning",
    })

    expect(state.expanded).toBe(false)
    expect(state.phase).toBe("completed")
    expect(state.statusText).toBe("done reasoning")
  })
})
