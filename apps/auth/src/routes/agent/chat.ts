import { logWideEvent } from "@workspace/logger"
import { Hono } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { z } from "zod"

import { AgentPhaseError, runAgentTurn } from "../../agent/loop"
import { AgentContextError, httpStatusFor } from "../../agent/org-context"
import { findConversationById } from "../../agent/persist"
import { type AgentContext, buildToolContext } from "../../agent/tool-ctx"

const chatMessageSchema = z.object({
  role: z.string(),
  content: z.string().nullish(),
  parts: z.array(z.any()).optional(),
})

const chatBodySchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  threadId: z.string().min(1).nullish(),
  forwardedProps: z
    .object({
      model: z.string().trim().min(1).max(120).nullish(),
      regenerate: z.boolean().optional(),
      resume: z.boolean().optional(),
    })
    .optional(),
})

/** Keep slow provider turns alive. SSE comments are ignored by the client
 * parser but count as activity for Bun's idle timeout. */
function withSseHeartbeat(response: Response, intervalMs = 15_000): Response {
  if (!response.body) return response

  const reader = response.body.getReader()
  const encoder = new TextEncoder()
  let timer: ReturnType<typeof setInterval> | undefined
  let closed = false

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      timer = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"))
      }, intervalMs)

      void (async () => {
        try {
          while (true) {
            const result = await reader.read()
            if (result.done) break
            if (!closed) controller.enqueue(result.value)
          }
          closed = true
          if (timer) clearInterval(timer)
          controller.close()
        } catch (error) {
          closed = true
          if (timer) clearInterval(timer)
          controller.error(error)
        }
      })()
    },
    async cancel() {
      closed = true
      if (timer) clearInterval(timer)
      await reader.cancel()
    },
  })

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

export const agentChatRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: { activeOrganizationId?: string | null } | null
  }
}>()

/**
 * POST /api/agent/chat — the agent turn (02-§2).
 * Auth → body validation → model + prompt + tools → SSE stream → persistence
 * in the stream lifecycle (see `runAgentTurn`).
 */
agentChatRouter.post("/chat", async (c) => {
  const reject = (
    status: ContentfulStatusCode,
    code: string,
    message: string
  ) => {
    logWideEvent({
      event: "agent.chat.turn.rejected",
      outcome: "failure",
      error: { code, message },
    })
    return c.json({ error: { code, message } }, status)
  }

  let ctx: AgentContext | undefined
  try {
    ctx = await buildToolContext(c)
  } catch (err) {
    if (err instanceof AgentContextError) {
      return reject(httpStatusFor(err.code), err.code, err.message)
    }
    return reject(
      500,
      "context_build_failed",
      err instanceof Error ? err.message : "Failed to build agent context"
    )
  }

  const body = await c.req.json().catch(() => null)
  const parsed = chatBodySchema.safeParse(body)
  if (!parsed.success) {
    return reject(422, "invalid_chat_body", "Invalid chat request body")
  }
  const { messages, threadId, forwardedProps } = parsed.data
  const agentCtx = ctx as AgentContext

  if (threadId && /^[0-9a-f-]{36}$/i.test(threadId)) {
    const existing = await findConversationById(threadId)
    if (existing && existing.organizationId !== agentCtx.organizationId) {
      return reject(403, "forbidden", "No access to this conversation")
    }
  }

  const startTime = Date.now()
  try {
    const { conversation, isNewConversation, model, response } =
      await runAgentTurn(agentCtx, {
        messages,
        threadId: threadId ?? null,
        model: forwardedProps?.model ?? null,
        regenerate: forwardedProps?.regenerate ?? false,
        resume: forwardedProps?.resume ?? false,
        abortSignal: c.req.raw.signal,
      })

    logWideEvent({
      event: "agent.chat.turn.start",
      durationMs: Date.now() - startTime,
      organizationId: agentCtx.organizationId,
      userId: agentCtx.userId,
      entityId: conversation.id,
      outcome: "success",
      metadata: {
        isNewConversation,
        regenerate: forwardedProps?.regenerate ?? false,
        messageCount: messages.length,
        model,
      },
    })

    return withSseHeartbeat(response)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Chat turn failed"
    const phase = err instanceof AgentPhaseError ? err.phase : "chat_setup"
    logWideEvent({
      event: "agent.chat.turn.failed",
      durationMs: Date.now() - startTime,
      organizationId: agentCtx.organizationId,
      userId: agentCtx.userId,
      outcome: "error",
      error: {
        code: "chat_setup_failed",
        message: `${phase}: ${errorMessage}`,
      },
    })
    return reject(500, "chat_setup_failed", `${phase}: ${errorMessage}`)
  }
})
