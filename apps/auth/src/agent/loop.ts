import type { StreamChunk } from "@tanstack/ai"
import {
  chat,
  convertMessagesToModelMessages,
  maxIterations,
  toServerSentEventsResponse,
} from "@tanstack/ai"
import type { AnyTextAdapter } from "@tanstack/ai/adapters"
import { AI_MAX_TOOL_ITERATIONS } from "@workspace/agent"
import { logger } from "@workspace/logger"
import { createPartsCollector } from "./parts"
import {
  appendUserMessage,
  type ConversationRow,
  deleteLastAssistantMessage,
  logPersistenceError,
  persistAssistantMessage,
  resolveOrCreateConversation,
} from "./persist"
import { buildPrompt } from "./prompt"
import { getAIAdapter } from "./provider"
import type { AgentContext } from "./tool-ctx"
import { buildAgentTools } from "./tools/catalog"

export interface ChatTurnInput {
  /** AG-UI wire messages (UIMessage shape) from the client. */
  messages: unknown[]
  threadId?: string | null
  model?: string | null
  /** When true, drop the last assistant message and re-run the turn. */
  regenerate?: boolean
  /** Adapter override (tests inject a mock; defaults to OpenRouter). */
  adapter?: AnyTextAdapter
}

export interface ChatTurnResult {
  conversation: ConversationRow
  isNewConversation: boolean
  model: string
  /** SSE Response to return to the client. */
  response: Response
}

export class AgentPhaseError extends Error {
  constructor(
    public readonly phase: string,
    cause: unknown
  ) {
    super(
      `Agent failed during ${phase}: ${cause instanceof Error ? cause.message : String(cause)}`
    )
    this.name = "AgentPhaseError"
    this.cause = cause
  }
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""
  return String(value)
}

function jsonValue(value: unknown): string {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value ?? {})
  } catch {
    return "{}"
  }
}

type SanitizedMessage = {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string | null
  parts: Array<Record<string, unknown>>
  toolCallId?: string
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function sanitizeStreamChunk(chunk: StreamChunk): StreamChunk {
  const raw = chunk as unknown as Record<string, unknown>
  if (!raw || typeof raw !== "object") return chunk
  if (raw.type === "TOOL_CALL_RESULT") {
    return {
      ...raw,
      content:
        typeof raw.content === "string"
          ? raw.content
          : jsonValue(raw.result ?? raw.output ?? {}),
    } as StreamChunk
  }
  if (raw.type === "TOOL_CALL_END") {
    return {
      ...raw,
      ...(raw.result === undefined ? { result: "{}" } : {}),
    } as StreamChunk
  }
  if (raw.type === "MESSAGES_SNAPSHOT") {
    return {
      ...raw,
      messages: Array.isArray(raw.messages) ? raw.messages : [],
    } as StreamChunk
  }
  return chunk
}

function sanitizePart(
  part: unknown,
  index: number
): Record<string, unknown> | null {
  if (!part || typeof part !== "object" || Array.isArray(part)) return null
  const p = part as Record<string, unknown>
  const type = String(p.type ?? "")
  if (type === "text") {
    const text = textValue(p.text ?? p.content ?? p.value)
    return { type: "text", text, content: text }
  }
  if (type === "thinking") {
    const thinking = textValue(p.thinking ?? p.content)
    return { type: "thinking", thinking, content: thinking }
  }
  if (
    type === "tool-call" ||
    type === "tool_call" ||
    type === "tool-invocation" ||
    type === "tool"
  ) {
    const id = String(p.id ?? p.toolCallId ?? `tool-${index}`)
    const name = String(p.name ?? p.toolName ?? p.tool ?? "unknown_tool")
    const args = safeRecord(p.args ?? p.input ?? p.parameters ?? p.data)
    const argumentsText =
      typeof p.arguments === "string" ? p.arguments : jsonValue(args)
    return {
      type: "tool-call",
      id,
      toolCallId: id,
      name,
      toolName: name,
      arguments: argumentsText,
      args,
      state: String(p.state ?? "input-complete"),
      ...(p.approval !== undefined ? { approval: p.approval } : {}),
      ...(p.output !== undefined ? { output: p.output } : {}),
    }
  }
  if (type === "tool-result" || type === "tool_result") {
    const id = String(p.toolCallId ?? p.id ?? `tool-result-${index}`)
    const result = p.result ?? p.output ?? p.content ?? {}
    const content =
      typeof p.content === "string" ? p.content : jsonValue(result)
    return {
      type: "tool-result",
      id,
      toolCallId: id,
      name: String(p.name ?? p.toolName ?? "unknown_tool"),
      toolName: String(p.toolName ?? p.name ?? "unknown_tool"),
      content: content || "{}",
      result,
      output: result,
      state: String(p.state ?? "complete"),
      ...(p.isError !== undefined ? { isError: Boolean(p.isError) } : {}),
    }
  }
  return null
}

/**
 * Canonical boundary sanitizer. TanStack AI assumes `parts` is an array and
 * OpenAI's adapter assumes content arrays contain valid objects. Enforce both
 * invariants before either library receives client or persisted history.
 */
export function sanitizeMessagesForAI(input: unknown): SanitizedMessage[] {
  if (!Array.isArray(input)) return []
  return input.flatMap((raw, messageIndex) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
    const m = raw as Record<string, unknown>
    const role =
      m.role === "assistant" || m.role === "system" || m.role === "tool"
        ? m.role
        : "user"
    const rawParts = Array.isArray(m.parts) ? m.parts : []
    const parts = rawParts.flatMap((part, partIndex) => {
      const sanitized = sanitizePart(part, partIndex)
      return sanitized ? [sanitized] : []
    })
    const content = typeof m.content === "string" ? m.content : null
    if (role === "user" && parts.length === 0 && content?.trim()) {
      parts.push({ type: "text", text: content, content })
    }
    if (role === "user" && parts.length === 0) {
      return []
    }
    const toolCallId =
      typeof m.toolCallId === "string" ? m.toolCallId : undefined
    return [
      {
        id: String(m.id ?? `message-${messageIndex}`),
        role,
        content: content || (role === "tool" ? "{}" : null),
        parts,
        ...(toolCallId ? { toolCallId } : {}),
      },
    ]
  })
}

export function normalizeMessagesForAI(messages: unknown[]): unknown[] {
  if (!Array.isArray(messages)) return []
  const normalized = messages
    .map((msg, idx) => {
      if (!msg || typeof msg !== "object") return null
      const m = msg as any
      const role = m.role ?? "user"

      let parts: any[] = []
      if (Array.isArray(m.parts)) {
        parts = m.parts
          .map((p: any, pIdx: number) => {
            if (!p || typeof p !== "object") return null
            if (p.type === "text") {
              const text = textValue(p.content ?? p.text ?? p.value)
              return {
                type: "text",
                text,
                content: text,
              }
            }
            if (p.type === "thinking") {
              const thinking = textValue(p.content ?? p.thinking)
              return {
                type: "thinking",
                thinking,
                content: thinking,
              }
            }
            if (
              p.type === "tool-call" ||
              p.type === "tool_call" ||
              p.type === "tool-invocation" ||
              p.type === "tool"
            ) {
              const toolArgs =
                typeof p.arguments === "string"
                  ? p.arguments
                  : typeof p.args === "string"
                    ? p.args
                    : jsonValue(p.arguments ?? p.args ?? p.input)
              let parsedArgs: Record<string, unknown> = {}
              try {
                parsedArgs =
                  typeof p.args === "object" && p.args !== null
                    ? p.args
                    : JSON.parse(toolArgs)
              } catch {
                parsedArgs = {}
              }
              const id = String(p.id ?? p.toolCallId ?? `tc_${idx}_${pIdx}`)
              const name = String(p.name ?? p.toolName ?? "")
              return {
                type: "tool-call",
                id,
                toolCallId: id,
                name,
                toolName: name,
                arguments: toolArgs,
                args: parsedArgs,
                state: p.state || "input-complete",
                ...(p.approval !== undefined ? { approval: p.approval } : {}),
                ...(p.output !== undefined ? { output: p.output } : {}),
                ...(p.result !== undefined
                  ? { output: p.result, result: p.result }
                  : {}),
              }
            }
            if (p.type === "tool-result" || p.type === "tool_result") {
              const toolCallId = String(
                p.toolCallId ?? p.id ?? `tc_${idx}_${pIdx}`
              )
              const toolName = String(p.toolName ?? p.name ?? "")
              const rawResult = p.result ?? p.output ?? p.content
              const contentStr =
                typeof p.content === "string"
                  ? p.content
                  : typeof rawResult === "string"
                    ? rawResult
                    : jsonValue(rawResult)
              let parsedResult: unknown = rawResult
              if (parsedResult === undefined && contentStr) {
                try {
                  parsedResult = JSON.parse(contentStr)
                } catch {
                  parsedResult = contentStr
                }
              }
              return {
                type: "tool-result",
                id: toolCallId,
                toolCallId,
                name: toolName,
                toolName,
                content: contentStr,
                result: parsedResult ?? {},
                output: parsedResult ?? {},
                state: p.state || "complete",
                ...(p.isError !== undefined
                  ? { isError: Boolean(p.isError) }
                  : {}),
              }
            }
            return p
          })
          .filter(Boolean)
      }

      // Convert direct m.toolCalls array if parts is empty or lacks tool-call parts
      if (Array.isArray(m.toolCalls) && m.toolCalls.length > 0) {
        for (let tcIdx = 0; tcIdx < m.toolCalls.length; tcIdx++) {
          const tc = m.toolCalls[tcIdx]
          if (tc && typeof tc === "object") {
            const tcId = String(tc.id ?? `tc_${idx}_${tcIdx}`)
            const tcName = String(
              tc.function?.name ?? tc.name ?? tc.toolName ?? ""
            )
            const tcArgs =
              typeof tc.function?.arguments === "string"
                ? tc.function.arguments
                : typeof tc.arguments === "string"
                  ? tc.arguments
                  : typeof tc.args === "string"
                    ? tc.args
                    : jsonValue(
                        tc.function?.arguments ??
                          tc.arguments ??
                          tc.args ??
                          tc.input
                      )
            const alreadyInParts = parts.some(
              (p) =>
                (p.type === "tool-call" || p.type === "tool") && p.id === tcId
            )
            if (!alreadyInParts) {
              parts.push({
                type: "tool-call",
                id: tcId,
                toolCallId: tcId,
                name: tcName,
                toolName: tcName,
                arguments: tcArgs,
                state: "input-complete",
              })
            }
          }
        }
      }

      const textContent =
        typeof m.content === "string"
          ? m.content
          : typeof m.text === "string"
            ? m.text
            : parts
                .filter((p) => p.type === "text")
                .map((p) => textValue(p.content ?? p.text))
                .join("")

      if (role === "user") {
        if (parts.length === 0) {
          const finalPrompt = textContent.trim() || "..."
          parts = [{ type: "text", text: finalPrompt, content: finalPrompt }]
        } else {
          for (const p of parts) {
            if (p.type === "text") {
              const t = textValue(p.content ?? p.text ?? textContent)
              p.content = t
              p.text = t
            }
          }
        }
      }

      if (role === "tool") {
        const toolCallId = String(m.toolCallId ?? m.id ?? `tc_${idx}`)
        const toolContent =
          textContent ||
          (typeof m.content === "object" && m.content !== null
            ? jsonValue(m.content)
            : "{}")
        if (parts.length === 0) {
          parts = [
            {
              type: "tool-result",
              id: toolCallId,
              toolCallId,
              content: toolContent,
              state: "complete",
            },
          ]
        }
        return {
          id: m.id || `msg-${Date.now()}-${idx}`,
          role: "tool",
          content: toolContent,
          toolCallId,
          parts,
        }
      }

      return {
        id: m.id || `msg-${Date.now()}-${idx}`,
        role,
        content: textContent ? textContent : null, // ALWAYS null or string, NEVER undefined!
        parts, // ALWAYS an array, NEVER undefined!
      }
    })
    .filter(Boolean)

  return sanitizeMessagesForAI(normalized)
}

/**
 * Runs one agent turn (02-§2 step 6/7): persists the user message, streams
 * the model reply over SSE, and persists the assistant message when the
 * stream terminates (status `complete` / `interrupted`).
 *
 * The persistence hook lives inside the generator that feeds the SSE encoder,
 * so it also fires on client disconnect (Bun cancels the body → the
 * generator's finally block runs → assistant message saved as interrupted).
 */
export async function runAgentTurn(
  ctx: AgentContext,
  input: ChatTurnInput
): Promise<ChatTurnResult> {
  const { adapter, model } = input.adapter
    ? {
        adapter: input.adapter,
        model: input.model ?? "",
      }
    : await getAIAdapter(ctx.organizationId, input.model)

  const { conversation, isNew } = await resolveOrCreateConversation({
    threadId: input.threadId,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    model,
  })

  if (input.regenerate) {
    if (input.threadId && !isNew) {
      const removed = await deleteLastAssistantMessage(conversation.id)
      if (!removed) {
        logger.warn(
          { conversationId: conversation.id },
          "chat regenerate: no assistant message to drop"
        )
      }
    }
  } else {
    await appendUserMessage({
      conversationId: conversation.id,
      organizationId: ctx.organizationId,
      parts: input.messages,
      model,
    })
  }

  let normalizedMessages: unknown[]
  try {
    normalizedMessages = normalizeMessagesForAI(input.messages)
    logger.info(
      {
        phase: "request_normalization",
        conversationId: conversation.id,
        messageCount: normalizedMessages.length,
        partCounts: normalizedMessages.map((message) =>
          Array.isArray((message as any).parts)
            ? (message as any).parts.length
            : -1
        ),
      },
      "agent message boundary normalized"
    )
  } catch (err) {
    logger.error(
      { phase: "request_normalization", conversationId: conversation.id, err },
      "agent message normalization failed"
    )
    throw new AgentPhaseError("request_normalization", err)
  }

  let agentStream: AsyncIterable<StreamChunk>
  try {
    // Convert once at our boundary and pass ModelMessages to chat(). This
    // prevents TanStack's UIMessage converter from walking client-owned parts
    // a second time during a clarification/tool continuation.
    const modelMessages = convertMessagesToModelMessages(
      normalizedMessages as never[]
    )
    agentStream = chat({
      adapter,
      messages: modelMessages as never[],
      tools: buildAgentTools(ctx),
      systemPrompts: [buildPrompt(ctx)],
      agentLoopStrategy: maxIterations(AI_MAX_TOOL_ITERATIONS),
      threadId: conversation.id,
    })
  } catch (err) {
    logger.error(
      { phase: "tanstack_conversion", conversationId: conversation.id, err },
      "agent chat engine initialization failed"
    )
    throw new AgentPhaseError("tanstack_conversion", err)
  }

  const response = toServerSentEventsResponse(
    withPersistence(agentStream, conversation, ctx, model)
  )
  return { conversation, isNewConversation: isNew, model, response }
}

/**
 * Wraps the agent stream so the assistant message is persisted exactly once,
 * immediately after the wire stream ends. `complete` when the loop finished
 * cleanly; `interrupted` when it errored or the client disconnected.
 */
function withPersistence(
  stream: AsyncIterable<StreamChunk>,
  conversation: ConversationRow,
  ctx: AgentContext,
  model: string
): AsyncIterable<StreamChunk> {
  const collector = createPartsCollector()
  let status: "complete" | "interrupted" = "interrupted"

  async function* wrapping(): AsyncGenerator<StreamChunk, void, void> {
    try {
      for await (const chunk of collector.wrap(stream)) {
        // AG-UI requires tool-result content to be a string. A tool or an
        // approval placeholder can otherwise produce undefined, which makes
        // TanStack's client-side ModelMessage conversion call `.filter()` on
        // undefined after the tool visibly reaches "running".
        yield sanitizeStreamChunk(chunk)
      }
      status = "complete"
    } catch (err) {
      status = "interrupted"
      logger.error(
        {
          err,
          phase: "provider_serialization_or_stream",
          conversationId: conversation.id,
          model,
          partCount: collector.parts.length,
        },
        "chat turn stream failed"
      )
      throw new AgentPhaseError("provider_serialization_or_stream", err)
    } finally {
      await persistAssistantMessage({
        conversationId: conversation.id,
        organizationId: ctx.organizationId,
        parts: collector.parts,
        status,
        model,
      }).catch((err) => logPersistenceError("assistant-message", err))
    }
  }

  return wrapping()
}
