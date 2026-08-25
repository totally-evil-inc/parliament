import { db, schema } from "@workspace/database"
import { logWideEvent } from "@workspace/logger"
import type { ModelMessage } from "ai"

export interface ContextGovernorConfig {
  maxInlineToolChars: number
  slidingWindowTurns: number
}

const DEFAULT_CONFIG: ContextGovernorConfig = {
  maxInlineToolChars: 4800, // ~1,200 tokens
  slidingWindowTurns: 10,
}

export class ContextGovernor {
  constructor(private config: ContextGovernorConfig = DEFAULT_CONFIG) {}

  /**
   * Compacts tool execution results before pushing them back into model history.
   * If a tool output exceeds the inline token budget (e.g. 5,000 line database dump),
   * it spills the full payload to the `chat_artifact` table in PostgreSQL and returns
   * a structured head/tail excerpt with an artifact pointer to the LLM.
   */
  async processToolResult(options: {
    toolName: string
    rawResult: unknown
    organizationId: string
    conversationId: string
  }): Promise<{ content: string; spilled: boolean; artifactId?: string }> {
    const { toolName, rawResult, organizationId, conversationId } = options
    const stringified =
      typeof rawResult === "string"
        ? rawResult
        : JSON.stringify(rawResult ?? {}, null, 2)

    if (stringified.length <= this.config.maxInlineToolChars) {
      return { content: stringified, spilled: false }
    }

    // Spill to PostgreSQL chat_artifact table
    const byteSize = Buffer.byteLength(stringified, "utf-8")
    const artifactName = `${toolName}-output-${Date.now()}`

    let artifactId: string | undefined
    try {
      const [inserted] = await db
        .insert(schema.chatArtifact)
        .values({
          organizationId,
          conversationId,
          name: artifactName,
          mimeType: "application/json",
          content: stringified,
          byteSize,
        })
        .returning({ id: schema.chatArtifact.id })

      artifactId = inserted?.id
    } catch (err) {
      logWideEvent({
        event: "agent.artifact.spill_failed",
        outcome: "failure",
        organizationId,
        metadata: {
          toolName,
          error: err instanceof Error ? err.message : String(err),
        },
      })
    }

    const lines = stringified.split("\n")
    const totalLines = lines.length
    const head = lines.slice(0, 25).join("\n")
    const tail = lines.slice(-25).join("\n")

    const content = [
      `[OUTPUT OVERFLOW TRUNCATED — SPILLED TO ARTIFACT STORE]`,
      `Original Size: ${stringified.length} chars (~${totalLines} lines)`,
      artifactId ? `Artifact Pointer: artifact://${artifactId}` : "",
      "",
      `--- EXCERPT START (HEAD) ---`,
      head,
      `... [${Math.max(0, totalLines - 50)} lines omitted] ...`,
      `--- EXCERPT END (TAIL) ---`,
      tail,
    ]
      .filter(Boolean)
      .join("\n")

    return { content, spilled: true, artifactId }
  }

  /**
   * Applies a sliding window to conversation turns while preserving the initial user goal.
   */
  compactMessages(messages: ModelMessage[]): ModelMessage[] {
    const windowSize = this.config.slidingWindowTurns * 2
    if (messages.length <= windowSize) {
      return messages
    }

    // Always keep the initial user prompt (turn 0)
    const initialUserMessage = messages[0]
    let sliceStart = messages.length - windowSize

    // Invariant: Never start recentMessages slice on a 'tool' response message
    // without its preceding assistant 'tool-call' message.
    if (sliceStart > 0 && messages[sliceStart]?.role === "tool") {
      sliceStart = Math.max(0, sliceStart - 1)
    }

    const recentMessages = messages.slice(sliceStart)

    if (initialUserMessage && !recentMessages.includes(initialUserMessage)) {
      return [initialUserMessage, ...recentMessages]
    }

    return recentMessages
  }
}
