import { formatServerSentEvent } from "@workspace/agent"
import type { ModelMessage } from "ai"
import { AgentEngine } from "./agent-engine"
import {
  appendUserMessage,
  type ConversationRow,
  deleteLastAssistantMessage,
  logPersistenceError,
  persistAssistantMessage,
  resolveOrCreateConversation,
} from "./persist"
import { getLanguageModel } from "./provider"
import { extractRetryLineage } from "./retry-lineage"
import { ThinkTagDemuxer } from "./think-demuxer"
import type { AgentContext } from "./tool-ctx"

export interface ChatTurnInput {
  messages: Array<{ role: string; content?: string | null; parts?: any[] }>
  threadId?: string | null
  model?: string | null
  regenerate?: boolean
  resume?: boolean
  abortSignal?: AbortSignal
}

export interface ChatTurnResult {
  conversation: ConversationRow
  isNewConversation: boolean
  model: string
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

/**
 * Converts stored/inbound message parts to ModelMessage array for Vercel AI SDK Core.
 */
export function convertToModelMessages(
  messages: Array<{ role: string; content?: string | null; parts?: any[] }>
): ModelMessage[] {
  const result: ModelMessage[] = []

  for (const m of messages) {
    const role = (
      m.role === "assistant" || m.role === "system" ? m.role : "user"
    ) as "user" | "assistant" | "system"

    if (Array.isArray(m.parts) && m.parts.length > 0) {
      if (role === "assistant") {
        let currentAssistantParts: any[] = []
        let currentToolParts: any[] = []

        const flushAssistant = () => {
          if (currentAssistantParts.length > 0) {
            result.push({
              role: "assistant",
              content: currentAssistantParts as any,
            })
            currentAssistantParts = []
          }
        }

        const flushTool = () => {
          if (currentToolParts.length > 0) {
            result.push({
              role: "tool",
              content: currentToolParts as any,
            })
            currentToolParts = []
          }
        }

        for (const p of m.parts) {
          if (!p) continue
          if (p.type === "text") {
            const text = p.text ?? p.content ?? ""
            if (text.trim()) {
              flushTool()
              currentAssistantParts.push({ type: "text", text })
            }
          } else if (p.type === "tool-call" || p.type === "tool-invocation") {
            flushTool()
            currentAssistantParts.push({
              type: "tool-call",
              toolCallId: p.toolCallId ?? p.id ?? crypto.randomUUID(),
              toolName: p.toolName ?? p.name ?? "",
              input: p.input ?? p.args ?? {},
            })
          } else if (p.type === "tool-result") {
            flushAssistant()
            const rawOutput = p.result ?? p.output ?? {}
            const stringVal =
              typeof rawOutput === "string"
                ? rawOutput
                : JSON.stringify(rawOutput)
            currentToolParts.push({
              type: "tool-result",
              toolCallId: p.toolCallId ?? p.id ?? crypto.randomUUID(),
              toolName: p.toolName ?? p.name ?? "",
              output: p.isError
                ? { type: "error-text" as const, value: stringVal }
                : { type: "text" as const, value: stringVal },
            })
          }
        }

        flushAssistant()
        flushTool()
        continue
      }

      // User role
      const textContent = m.parts
        .filter((p) => p && (p.type === "text" || p.type === "thinking"))
        .map((p) => p.text ?? p.content ?? p.thinking ?? "")
        .join("")

      if (textContent.trim()) {
        result.push({ role: "user", content: textContent })
      }
      continue
    }

    // Fallback for simple content string
    if (typeof m.content === "string" && m.content.trim()) {
      result.push({
        role,
        content: m.content.trim(),
      })
    }
  }

  return result
}

/**
 * Runs one agent turn: persists user prompt, executes the AgentEngine FSM loop,
 * streams typed SSE chunks, and persists the assistant message on stream completion.
 */
export async function runAgentTurn(
  ctx: AgentContext,
  input: ChatTurnInput
): Promise<ChatTurnResult> {
  const { model, modelName } = await getLanguageModel(
    ctx.organizationId,
    input.model
  )

  const { conversation, isNew } = await resolveOrCreateConversation({
    threadId: input.threadId,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    model: modelName,
  })

  const lastMsgRole = input.messages[input.messages.length - 1]?.role
  const isResume = Boolean(input.resume || lastMsgRole === "assistant")

  if (input.regenerate) {
    if (input.threadId && !isNew) {
      await deleteLastAssistantMessage(conversation.id)
    }
  } else if (isResume) {
    // Resuming a turn after action approval: user prompt already persisted,
    // now streaming continuation with tool execution result.
  } else {
    await appendUserMessage({
      conversationId: conversation.id,
      organizationId: ctx.organizationId,
      parts: input.messages,
      model: modelName,
    })
  }

  const modelMessages = convertToModelMessages(input.messages)
  const retryLineage = extractRetryLineage(input.messages)
  const engine = new AgentEngine({ maxSteps: 8 })

  const eventStream = engine.executeTurn({
    ctx,
    model,
    modelName,
    conversationId: conversation.id,
    messages: modelMessages,
    retryLineage,
    abortSignal: input.abortSignal,
  })

  const encoder = new TextEncoder()
  const collectedParts: any[] = []
  let textBuffer = ""
  let thinkingBuffer = ""
  let status: "complete" | "interrupted" | "error" = "interrupted"

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of eventStream) {
          // Accumulate assistant parts for persistence
          if (event.type === "content:delta") {
            textBuffer += event.text
          } else if (event.type === "thinking:delta") {
            thinkingBuffer += event.text
          } else if (event.type === "tool:called") {
            collectedParts.push({
              type: "tool-call",
              toolCallId: event.callId,
              toolName: event.name,
              args: event.args,
              ...(event.retryOf ? { retryOf: event.retryOf } : {}),
              ...(event.attempt ? { attempt: event.attempt } : {}),
            })
          } else if (event.type === "tool:result") {
            collectedParts.push({
              type: "tool-result",
              toolCallId: event.callId,
              toolName: event.name,
              result: event.result,
              isError: event.isError,
              ...(event.retryOf ? { retryOf: event.retryOf } : {}),
              ...(event.attempt ? { attempt: event.attempt } : {}),
            })
          } else if (event.type === "action:approval_required") {
            collectedParts.push({
              type: "approval-requested",
              toolName: event.toolName,
              callId: event.callId,
              args: event.args,
              approvalId: event.approvalId,
              resumeId: event.approvalId,
              summary: event.summary,
            })
          } else if (event.type === "turn:error") {
            status = event.code === "aborted" ? "interrupted" : "error"
          } else if (event.type === "turn:suspended") {
            status = "interrupted"
          } else if (event.type === "turn:completed") {
            status = "complete"
          }

          const sseString = formatServerSentEvent(event)
          controller.enqueue(encoder.encode(sseString))
        }

        const extracted = ThinkTagDemuxer.extractThinkBlocks(textBuffer)
        const finalText = extracted.content
        let finalThinking = thinkingBuffer

        if (extracted.thinking) {
          finalThinking = finalThinking
            ? `${finalThinking}\n\n${extracted.thinking}`
            : extracted.thinking
        }

        if (finalThinking.trim()) {
          collectedParts.unshift({
            type: "thinking",
            thinking: finalThinking,
            content: finalThinking,
          })
        }
        if (finalText.trim()) {
          collectedParts.push({
            type: "text",
            text: finalText,
            content: finalText,
          })
        }

        controller.close()
      } catch (err) {
        status = "interrupted"
        controller.error(err)
      } finally {
        // Persist assistant message in DB (skip if completely empty and interrupted/aborted)
        if (collectedParts.length > 0 || status === "complete") {
          await persistAssistantMessage({
            conversationId: conversation.id,
            organizationId: ctx.organizationId,
            parts: collectedParts,
            status,
            model: modelName,
          }).catch((err) => logPersistenceError("assistant-message", err))
        }
      }
    },
  })

  const response = new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })

  return { conversation, isNewConversation: isNew, model: modelName, response }
}
