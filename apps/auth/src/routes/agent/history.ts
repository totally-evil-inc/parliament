import { isUuid, parseMessageParts } from "@workspace/agent"
import { and, count, db, desc, eq } from "@workspace/database"
import { chatConversation, chatMessage } from "@workspace/database/schema"
import { logWideEvent } from "@workspace/logger"
import { Hono } from "hono"
import { z } from "zod"
import {
  AgentContextError,
  httpStatusFor,
  resolveOrgContext,
} from "../../agent/org-context"
import {
  DEFAULT_CONVERSATION_TITLE,
  deriveTitle,
  findConversation,
  serializeConversation,
} from "../../agent/persist"

const patchConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((data) => data.title !== undefined || data.pinned !== undefined, {
    message: "At least one of 'title' or 'pinned' must be provided",
  })

const createConversationSchema = z.object({
  model: z.string().trim().min(1).max(100).optional(),
})

export const agentHistoryRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: { activeOrganizationId?: string | null } | null
  }
}>()

agentHistoryRouter.get("/conversations", async (c) => {
  const startTime = Date.now()
  try {
    const ctx = await resolveOrgContext(c)
    const rows = await db
      .select({
        id: chatConversation.id,
        title: chatConversation.title,
        model: chatConversation.model,
        metadata: chatConversation.metadata,
        updatedAt: chatConversation.updatedAt,
        messageCount: count(chatMessage.id),
      })
      .from(chatConversation)
      .leftJoin(
        chatMessage,
        eq(chatMessage.conversationId, chatConversation.id)
      )
      .where(eq(chatConversation.organizationId, ctx.organizationId))
      .groupBy(chatConversation.id)
      .orderBy(desc(chatConversation.updatedAt))
      .limit(100)

    logWideEvent({
      event: "agent.history.list",
      outcome: "success",
      durationMs: Date.now() - startTime,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      metadata: {
        count: rows.length,
      },
    })

    return c.json({
      conversations: rows.map((row) => ({
        id: row.id,
        title: row.title,
        model: row.model,
        pinned: Boolean(
          (row.metadata as Record<string, unknown> | null)?.pinned
        ),
        updatedAt: row.updatedAt.toISOString(),
        messageCount: Number(row.messageCount),
      })),
    })
  } catch (err) {
    if (err instanceof AgentContextError) {
      return c.json({ error: err.message }, httpStatusFor(err.code))
    }
    logWideEvent({
      event: "agent.history.list",
      outcome: "error",
      durationMs: Date.now() - startTime,
      error: {
        code: "history_error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
    })
    return c.json({ error: "Failed to fetch conversations" }, 500)
  }
})

agentHistoryRouter.get("/conversations/:id", async (c) => {
  const startTime = Date.now()
  try {
    const ctx = await resolveOrgContext(c)
    const threadId = c.req.param("id")
    if (!isUuid(threadId)) {
      return c.json({ error: "Conversation not found" }, 404)
    }

    const conversation = await findConversation(threadId, ctx.organizationId)
    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404)
    }

    const messages = await db
      .select()
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.conversationId, threadId),
          eq(chatMessage.organizationId, ctx.organizationId)
        )
      )
      .orderBy(chatMessage.createdAt)

    let currentTitle = conversation.title
    if (
      (currentTitle === DEFAULT_CONVERSATION_TITLE || !currentTitle) &&
      messages.length > 0
    ) {
      const firstUser = messages.find((m) => m.role === "user")
      if (firstUser) {
        const derived = deriveTitle(firstUser.parts)
        if (derived && derived !== DEFAULT_CONVERSATION_TITLE) {
          currentTitle = derived
          await db
            .update(chatConversation)
            .set({ title: derived, updatedAt: new Date() })
            .where(
              and(
                eq(chatConversation.id, threadId),
                eq(chatConversation.organizationId, ctx.organizationId)
              )
            )
        }
      }
    }

    logWideEvent({
      event: "agent.history.get",
      outcome: "success",
      durationMs: Date.now() - startTime,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityId: threadId,
      metadata: {
        messageCount: messages.length,
      },
    })

    return c.json({
      conversation: {
        ...serializeConversation(conversation, messages.length),
        title: currentTitle,
        pinned: Boolean(conversation.metadata?.pinned),
      },
      messages: messages.map((m) => {
        let parts: unknown = m.parts
        if (
          Array.isArray(parts) &&
          parts.length === 1 &&
          (parts[0] as any)?.role &&
          Array.isArray((parts[0] as any)?.parts)
        ) {
          parts = (parts[0] as any).parts
        }
        const safeParts = parseMessageParts(parts)
        return {
          id: m.id,
          role: m.role,
          parts: safeParts,
          status: m.status,
          model: m.model,
          createdAt: m.createdAt.toISOString(),
        }
      }),
    })
  } catch (err) {
    if (err instanceof AgentContextError) {
      return c.json({ error: err.message }, httpStatusFor(err.code))
    }
    logWideEvent({
      event: "agent.history.get",
      outcome: "error",
      durationMs: Date.now() - startTime,
      error: {
        code: "history_error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
    })
    return c.json({ error: "Failed to fetch conversation" }, 500)
  }
})

agentHistoryRouter.post("/conversations", async (c) => {
  const startTime = Date.now()
  try {
    const ctx = await resolveOrgContext(c)
    const body = createConversationSchema.safeParse(
      await c.req.json().catch(() => ({}))
    )
    if (!body.success) {
      return c.json({ error: "Invalid conversation payload" }, 400)
    }

    const [row] = await db
      .insert(chatConversation)
      .values({
        organizationId: ctx.organizationId,
        createdById: ctx.userId,
        model: body.data.model ?? null,
      })
      .returning()
    if (!row) throw new Error("Failed to create conversation")

    logWideEvent({
      event: "agent.history.create",
      outcome: "success",
      durationMs: Date.now() - startTime,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityId: row.id,
    })

    return c.json({ id: row.id }, 201)
  } catch (err) {
    if (err instanceof AgentContextError) {
      return c.json({ error: err.message }, httpStatusFor(err.code))
    }
    logWideEvent({
      event: "agent.history.create",
      outcome: "error",
      durationMs: Date.now() - startTime,
      error: {
        code: "history_error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
    })
    return c.json({ error: "Failed to create conversation" }, 500)
  }
})

agentHistoryRouter.patch("/conversations/:id", async (c) => {
  const startTime = Date.now()
  try {
    const ctx = await resolveOrgContext(c)
    const threadId = c.req.param("id")
    if (!isUuid(threadId)) {
      return c.json({ error: "Conversation not found" }, 404)
    }

    const body = patchConversationSchema.safeParse(
      await c.req.json().catch(() => ({}))
    )
    if (!body.success) {
      return c.json(
        {
          error: "Invalid conversation payload",
          details: body.error.flatten(),
        },
        400
      )
    }

    const existing = await findConversation(threadId, ctx.organizationId)
    if (!existing) {
      return c.json({ error: "Conversation not found" }, 404)
    }

    const updates: {
      title?: string
      metadata?: Record<string, unknown>
      updatedAt: Date
    } = {
      updatedAt: new Date(),
    }

    if (body.data.title !== undefined) {
      updates.title = body.data.title
    }

    if (body.data.pinned !== undefined) {
      const existingMeta =
        existing.metadata &&
        typeof existing.metadata === "object" &&
        existing.metadata !== null
          ? existing.metadata
          : {}
      updates.metadata = {
        ...existingMeta,
        pinned: body.data.pinned,
      }
    }

    const [row] = await db
      .update(chatConversation)
      .set(updates)
      .where(
        and(
          eq(chatConversation.id, threadId),
          eq(chatConversation.organizationId, ctx.organizationId)
        )
      )
      .returning()

    if (!row) {
      return c.json({ error: "Conversation not found" }, 404)
    }

    logWideEvent({
      event: "agent.history.patch",
      outcome: "success",
      durationMs: Date.now() - startTime,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityId: threadId,
      metadata: {
        renamed: body.data.title !== undefined,
        pinned: body.data.pinned !== undefined ? body.data.pinned : undefined,
      },
    })

    return c.json({
      id: row.id,
      title: row.title,
      pinned: Boolean((row.metadata as Record<string, unknown> | null)?.pinned),
    })
  } catch (err) {
    if (err instanceof AgentContextError) {
      return c.json({ error: err.message }, httpStatusFor(err.code))
    }
    logWideEvent({
      event: "agent.history.patch",
      outcome: "error",
      durationMs: Date.now() - startTime,
      error: {
        code: "history_error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
    })
    return c.json({ error: "Failed to update conversation" }, 500)
  }
})

agentHistoryRouter.delete("/conversations/:id", async (c) => {
  const startTime = Date.now()
  try {
    const ctx = await resolveOrgContext(c)
    const threadId = c.req.param("id")
    if (!isUuid(threadId)) {
      return c.json({ error: "Conversation not found" }, 404)
    }

    const result = await db
      .delete(chatConversation)
      .where(
        and(
          eq(chatConversation.id, threadId),
          eq(chatConversation.organizationId, ctx.organizationId)
        )
      )
      .returning({ id: chatConversation.id })

    if (result.length === 0) {
      return c.json({ error: "Conversation not found" }, 404)
    }

    logWideEvent({
      event: "agent.history.delete",
      outcome: "success",
      durationMs: Date.now() - startTime,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityId: threadId,
    })

    return c.json({ success: true })
  } catch (err) {
    if (err instanceof AgentContextError) {
      return c.json({ error: err.message }, httpStatusFor(err.code))
    }
    logWideEvent({
      event: "agent.history.delete",
      outcome: "error",
      durationMs: Date.now() - startTime,
      error: {
        code: "history_error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
    })
    return c.json({ error: "Failed to delete conversation" }, 500)
  }
})
