import { z } from "zod"

export const retryLineageEntrySchema = z.object({
  attempt: z.number().int().min(1),
})

export type RetryLineageEntry = z.infer<typeof retryLineageEntrySchema>

/**
 * Runtime-only registry of tool-call retry lineage, keyed by toolCallId.
 * Never enters model-facing message content sent to providers.
 */
export type RetryLineage = Map<string, RetryLineageEntry>

const attemptSchema = z.number().int().min(1)

interface LineageSourceMessage {
  role: string
  parts?: unknown[]
}

/**
 * Extracts validated retry lineage from raw persisted/inbound message parts.
 * Every tool call id is registered (attempt defaults to 1); explicit attempt
 * values are zod-validated and invalid values fall back to 1. For duplicate
 * ids across call/result parts, the highest attempt wins.
 */
export function extractRetryLineage(
  messages: LineageSourceMessage[]
): RetryLineage {
  const lineage: RetryLineage = new Map()

  for (const message of messages) {
    if (message?.role !== "assistant" || !Array.isArray(message.parts)) continue

    for (const rawPart of message.parts) {
      if (!rawPart || typeof rawPart !== "object") continue
      const part = rawPart as Record<string, unknown>
      const type = part.type
      if (
        type !== "tool-call" &&
        type !== "tool-invocation" &&
        type !== "tool-result"
      ) {
        continue
      }

      const callId = part.toolCallId ?? part.id
      if (typeof callId !== "string" || !callId) continue

      const candidate = attemptSchema.safeParse(part.attempt)
      const attempt = candidate.success ? candidate.data : 1

      const existing = lineage.get(callId)
      if (!existing || attempt > existing.attempt) {
        lineage.set(callId, { attempt })
      }
    }
  }

  return lineage
}
