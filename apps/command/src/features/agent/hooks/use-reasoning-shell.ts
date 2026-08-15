export type ReasoningPhase = "idle" | "submitting" | "reasoning" | "completed"

export interface ReasoningShellState {
  /** Whether the reasoning strip should be expanded. */
  expanded: boolean
  phase: ReasoningPhase
  /** Text shown in the strip: live thinking, or the fallback before any
   * reasoning text has been streamed. */
  statusText: string
}

export const REASONING_FALLBACK_TEXT = "Thinking…"

export interface ReasoningShellInput {
  isLoading: boolean
  thinking?: string
}

/**
 * Derives the reasoning shell state purely from the run lifecycle and the
 * latest streamed thinking:
 * - idle        — no run, nothing to show (collapsed)
 * - submitting  — run started, stream has not emitted reasoning yet
 * - reasoning   — run active with live thinking text
 * - completed   — run finished (collapses via `expanded`)
 */
export function deriveReasoningState({
  isLoading,
  thinking,
}: ReasoningShellInput): ReasoningShellState {
  const thinkingText = thinking?.trim() ?? ""
  const phase: ReasoningPhase = isLoading
    ? thinkingText
      ? "reasoning"
      : "submitting"
    : thinkingText
      ? "completed"
      : "idle"

  return {
    expanded: isLoading,
    phase,
    statusText: thinkingText || REASONING_FALLBACK_TEXT,
  }
}

export function useReasoningShell(input: ReasoningShellInput) {
  return deriveReasoningState(input)
}
