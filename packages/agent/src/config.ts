/**
 * Agent runtime configuration (07-§4 in ideation/agent-chat).
 * Env-driven; every value has a sane default so the loop is testable offline.
 */

// AI provider settings are organization-scoped and must come from the database.
// Keep this empty so an unset database value cannot silently route requests to a
// provider the user did not configure.
export const DEFAULT_MODEL = ""

export function resolveModel(model?: string | null): string {
  if (model && model.trim().length > 0) return model.trim()
  return DEFAULT_MODEL
}

export const AI_MAX_TOOL_ITERATIONS = Number(
  process.env.AI_MAX_TOOL_ITERATIONS ?? 8
)

export const QUICK_PROMPTS = [
  {
    label: "Pipeline overview",
    prompt:
      "How is my pipeline looking this month? Show pipeline analytics with a summary and the stage breakdown.",
  },
  {
    label: "Recent proposals",
    prompt: "Show my recent proposals and their statuses.",
  },
  {
    label: "Calendar",
    prompt: "What's on my calendar this week?",
  },
  {
    label: "Send a proposal",
    prompt:
      "Pick the most recent draft proposal and send it to its client. Wait for my approval before sending.",
  },
] as const
