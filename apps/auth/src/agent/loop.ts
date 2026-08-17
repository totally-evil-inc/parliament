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
import type { AgentContext } from "./tool-ctx"

export interface ChatTurnInput {
  messages: Array<{ role: string; content?: string | null; parts?: any[] }>
  threadId?: string | null
  model?: string | null
  regenerate?: boolean
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
function convertToModelMessages(
  messages: Array<{ role: string; content?: string | null; parts?: any[] }>
): ModelMessage[] {
  const result: ModelMessage[] = []

  for (const m of messages) {
    const role = (m.role === "assistant" || m.role === "system" ? m.role : "user") as "user" | "assistant" | "system"
    let textContent = ""

    if (Array.isArray(m.parts) && m.parts.length > 0) {
      textContent = m.parts
        .filter((p) => p && (p.type === "text" || p.type === "thinking"))
        .map((p) => p.text ?? p.content ?? p.thinking ?? "")
        .join("")
    }

    if (!textContent && typeof m.content === "string") {
      textContent = m.content
    }

    if (textContent.trim()) {
      result.push({
        role,
        content: textContent,
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

  if (input.regenerate) {
    if (input.threadId && !isNew) {
      await deleteLastAssistantMessage(conversation.id)
    }
  } else {
    await appendUserMessage({
      conversationId: conversation.id,
      organizationId: ctx.organizationId,
      parts: input.messages,
      model: modelName,
    })
  }

  const modelMessages = convertToModelMessages(input.messages)
  const engine = new AgentEngine({ maxSteps: 8 })

  const eventStream = engine.executeTurn({
    ctx,
    model,
    modelName,
    conversationId: conversation.id,
    messages: modelMessages,
  })

  const encoder = new TextEncoder()
  const collectedParts: any[] = []
  let textBuffer = ""
  let thinkingBuffer = ""
  let status: "complete" | "interrupted" = "interrupted"

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
            })
          } else if (event.type === "tool:result") {
            collectedParts.push({
              type: "tool-result",
              toolCallId: event.callId,
              toolName: event.name,
              result: event.result,
              isError: event.isError,
            })
          } else if (event.type === "action:approval_required") {
            collectedParts.push({
              type: "approval-requested",
              toolName: event.toolName,
              args: event.args,
              resumeId: event.approvalId,
            })
          }

          const sseString = formatServerSentEvent(event)
          controller.enqueue(encoder.encode(sseString))
        }

        if (thinkingBuffer.trim()) {
          collectedParts.unshift({
            type: "thinking",
            thinking: thinkingBuffer,
            content: thinkingBuffer,
          })
        }
        if (textBuffer.trim()) {
          collectedParts.push({
            type: "text",
            text: textBuffer,
            content: textBuffer,
          })
        }

        status = "complete"
        controller.close()
      } catch (err) {
        status = "interrupted"
        controller.error(err)
      } finally {
        // Persist assistant message in DB
        await persistAssistantMessage({
          conversationId: conversation.id,
          organizationId: ctx.organizationId,
          parts: collectedParts,
          status,
          model: modelName,
        }).catch((err) => logPersistenceError("assistant-message", err))
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
