import { z } from "zod"

/**
 * Serializable AG-UI message parts (03-§2 in ideation/agent-chat).
 *
 * Persisted verbatim in chat_message.parts so a reload can reconstruct the
 * thread byte-identically, including rendered OpenUI programs and approval
 * requests. Discriminated by `type`.
 */

export const textPart = z.object({
  type: z.literal("text"),
  text: z.string().optional(),
  content: z.string().optional(),
})

export const thinkingPart = z.object({
  type: z.literal("thinking"),
  thinking: z.string().optional(),
  content: z.string().optional(),
})

export const toolCallPart = z.object({
  type: z.literal("tool-call"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  id: z.string().optional(),
  name: z.string().optional(),
  arguments: z.string().optional(),
  state: z.string().optional(),
})

export const toolResultPart = z.object({
  type: z.literal("tool-result"),
  toolCallId: z.string(),
  toolName: z.string().optional(),
  result: z.unknown(),
  id: z.string().optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  output: z.unknown().optional(),
  state: z.string().optional(),
  isError: z.boolean().optional(),
})

export const approvalRequestedPart = z.object({
  type: z.literal("approval-requested"),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  resumeId: z.string(),
  messageId: z.string().optional(),
})

export const filePart = z.object({
  type: z.literal("file"),
  name: z.string(),
  mimeType: z.string(),
  data: z.string(),
})

export const stepStartPart = z.object({
  type: z.literal("step-start"),
  messageId: z.string().optional(),
})

export const stepFinishPart = z.object({
  type: z.literal("step-finish"),
  messageId: z.string().optional(),
})

export const messagePartJson = z.discriminatedUnion("type", [
  textPart,
  thinkingPart,
  toolCallPart,
  toolResultPart,
  approvalRequestedPart,
  filePart,
  stepStartPart,
  stepFinishPart,
])

export type MessagePartJson = z.infer<typeof messagePartJson>

/**
 * Tolerant parser for persisted parts: unknown part types are preserved as
 * opaque JSON rather than dropped, so history survives forward library moves.
 */
export function parseMessageParts(value: unknown): MessagePartJson[] {
  if (!Array.isArray(value)) return []
  const parsed: MessagePartJson[] = []
  for (const item of value) {
    const result = messagePartJson.safeParse(item)
    if (result.success) {
      const data = result.data
      if (data.type === "text") {
        const text = data.text ?? data.content ?? ""
        parsed.push({ type: "text", text, content: text })
      } else if (data.type === "thinking") {
        const thinking = data.thinking ?? data.content ?? ""
        parsed.push({ type: "thinking", thinking, content: thinking })
      } else {
        parsed.push(data)
      }
    } else if (item && typeof item === "object") {
      parsed.push(item as MessagePartJson)
    }
  }
  return parsed
}
