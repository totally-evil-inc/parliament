import type { StreamChunk } from "@tanstack/ai"
import type { MessagePartJson } from "@workspace/agent/message-parts"

/** Structural slice of the wire events this collector reads. */
interface WireEvent {
  type: string
  id?: string
  messageId?: string
  delta?: string
  toolCallId?: string
  toolCallName?: string
  toolName?: string
  name?: string
  args?: string
  arguments?: string
  value?: unknown
  content?: string
  result?: unknown
  output?: unknown
  isError?: boolean
}

/**
 * AG-UI event → persisted-part collector (03-§4 step 5).
 *
 * `createPartsCollector()` returns a `wrap(stream)` generator that yields
 * every chunk unchanged (so the SSE wire is untouched) while deriving the
 * assistant message parts (text, thinking, tool-call, tool-result,
 * approval-requested) into an externally readable array. The loop persists
 * `collector.parts` when the wrapped stream terminates — including on client
 * disconnect (generator cancellation), which the stream's finally block
 * catches and records as `interrupted`.
 */
export function createPartsCollector() {
  const parts: MessagePartJson[] = []

  async function* wrap(
    stream: AsyncIterable<StreamChunk>
  ): AsyncGenerator<StreamChunk, void, void> {
    const textBuffers = new Map<string, string>()
    const thinkingBuffers: string[] = []
    const completedThinking = new Set<string>()
    const toolCalls = new Map<
      string,
      { toolCallId: string; name: string; args: string }
    >()

    try {
      for await (const chunk of stream) {
        const raw = chunk as unknown as WireEvent
        switch (raw.type) {
          case "TEXT_MESSAGE_CONTENT": {
            const current = textBuffers.get(raw.messageId ?? "") ?? ""
            textBuffers.set(raw.messageId ?? "", current + (raw.delta ?? ""))
            break
          }
          case "TEXT_MESSAGE_END": {
            const text = textBuffers.get(raw.messageId ?? "") ?? ""
            textBuffers.delete(raw.messageId ?? "")
            if (text) parts.push({ type: "text", text, content: text })
            break
          }
          case "THINKING_TEXT_MESSAGE_CONTENT":
          case "REASONING_MESSAGE_CONTENT": {
            thinkingBuffers.push(typeof raw.delta === "string" ? raw.delta : "")
            break
          }
          case "THINKING_TEXT_MESSAGE_END":
          case "REASONING_MESSAGE_END": {
            const thinking = thinkingBuffers.join("")
            thinkingBuffers.length = 0
            // Some adapters emit both legacy STEP reasoning and canonical
            // REASONING events. Keep one logical thinking part.
            if (thinking && !completedThinking.has(thinking)) {
              completedThinking.add(thinking)
              parts.push({ type: "thinking", thinking, content: thinking })
            }
            break
          }
          case "TOOL_CALL_START": {
            const toolCallId =
              raw.toolCallId ?? raw.id ?? `tool-${toolCalls.size}`
            const name =
              raw.toolCallName ?? raw.toolName ?? raw.name ?? "unknown"
            toolCalls.set(toolCallId, {
              toolCallId,
              name,
              args: "",
            })
            break
          }
          case "TOOL_CALL_ARGS": {
            const toolCallId =
              raw.toolCallId ??
              raw.id ??
              Array.from(toolCalls.keys()).pop() ??
              ""
            const delta =
              raw.delta ??
              raw.args ??
              raw.arguments ??
              (typeof raw.value === "string" ? raw.value : "")
            const call = toolCalls.get(toolCallId)
            if (call) call.args += delta
            break
          }
          case "TOOL_CALL_END": {
            const toolCallId =
              raw.toolCallId ??
              raw.id ??
              Array.from(toolCalls.keys()).pop() ??
              ""
            const call = toolCalls.get(toolCallId)
            if (call) {
              const parsedArgs = parseJsonObject(call.args)
              parts.push({
                type: "tool-call",
                id: call.toolCallId,
                toolCallId: call.toolCallId,
                name: call.name,
                toolName: call.name,
                arguments: call.args,
                args: parsedArgs,
                state: "input-complete",
              })
              toolCalls.delete(call.toolCallId)
            }
            break
          }
          case "TOOL_CALL_RESULT": {
            const toolCallId = raw.toolCallId ?? raw.id ?? ""
            const toolName = raw.toolCallName ?? raw.toolName ?? raw.name ?? ""
            const contentStr =
              typeof raw.content === "string"
                ? raw.content
                : typeof raw.result === "string"
                  ? raw.result
                  : raw.result !== undefined
                    ? JSON.stringify(raw.result)
                    : typeof raw.output === "string"
                      ? raw.output
                      : raw.output !== undefined
                        ? JSON.stringify(raw.output)
                        : typeof raw.value === "string"
                          ? raw.value
                          : ""
            const result = parseJsonValue(contentStr)
            parts.push({
              type: "tool-result",
              id: toolCallId,
              toolCallId,
              name: toolName,
              toolName,
              content: contentStr || "{}",
              result: result ?? {},
              output: result ?? {},
              state: "complete",
              isError: Boolean(raw.isError),
            })
            break
          }
          case "CUSTOM": {
            if (raw.name === "approval-requested" && raw.value) {
              const value = raw.value as Record<string, unknown>
              parts.push({
                type: "approval-requested",
                toolName: String(value.toolName ?? ""),
                args: (value.args ?? {}) as Record<string, unknown>,
                resumeId: String(value.resumeId ?? ""),
                messageId: value.messageId
                  ? String(value.messageId)
                  : undefined,
              })
            }
            break
          }
          default:
            break
        }
        yield chunk
      }

      for (const call of toolCalls.values()) {
        parts.push({
          type: "tool-call",
          toolCallId: call.toolCallId,
          toolName: call.name,
          args: parseJsonObject(call.args),
        })
      }
      toolCalls.clear()
      const danglingThinking = thinkingBuffers.join("")
      if (danglingThinking && !completedThinking.has(danglingThinking)) {
        parts.push({
          type: "thinking",
          thinking: danglingThinking,
          content: danglingThinking,
        })
      }
      for (const [messageId, text] of textBuffers) {
        if (text) parts.push({ type: "text", text, content: text })
        textBuffers.delete(messageId)
      }
    } finally {
      // Intentionally empty: the loop persists from `parts` after this
      // generator finishes (or is cancelled).
    }
  }

  return { parts, wrap }
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const value = parseJsonValue(raw)
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function parseJsonValue(raw: string): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
