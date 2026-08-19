import { isUuid } from "@workspace/agent"
import {
  type MessagePartJson,
  parseMessageParts,
} from "@workspace/agent/message-parts"
import { and, count, db, desc, eq } from "@workspace/database"
import { chatConversation, chatMessage } from "@workspace/database/schema"
import { logger } from "@workspace/logger"

/**
 * Durable, org-scoped conversation persistence (03-§4 in ideation/agent-chat).
 * The chat SSE route is the only caller; every function is org-scoped.
 */

export const DEFAULT_CONVERSATION_TITLE = "New conversation"

export interface ConversationRow {
  id: string
  organizationId: string
  title: string
  model: string | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface MessageRow {
  id: string
  conversationId: string
  role: "user" | "assistant" | "system"
  parts: unknown[]
  status: "complete" | "interrupted" | "error"
  model: string | null
  createdAt: Date
}

export function extractUserMessageParts(input: unknown): MessagePartJson[] {
  if (!input) return []
  if (Array.isArray(input)) {
    // If input is an array of UIMessages (e.g. from chatBody.messages), find the last user message
    for (let i = input.length - 1; i >= 0; i--) {
      const m = input[i] as any
      if (m && typeof m === "object" && m.role === "user") {
        if (Array.isArray(m.parts) && m.parts.length > 0) {
          return parseMessageParts(
            m.parts.map((p: any) =>
              p?.type === "text"
                ? {
                    type: "text",
                    text: p.text ?? p.content ?? "",
                    content: p.content ?? p.text ?? "",
                  }
                : p
            )
          )
        }
        if (typeof m.content === "string" && m.content.trim()) {
          return [
            { type: "text", text: m.content.trim(), content: m.content.trim() },
          ]
        }
        if (typeof m.text === "string" && m.text.trim()) {
          return [{ type: "text", text: m.text.trim(), content: m.text.trim() }]
        }
      }
    }
    // If input is already an array of parts
    const parsed = parseMessageParts(
      input.map((p: any) =>
        p?.type === "text"
          ? { type: "text", text: p.text ?? p.content ?? "" }
          : p
      )
    )
    if (parsed.length > 0) return parsed
  }
  if (typeof input === "string" && input.trim()) {
    return [{ type: "text", text: input.trim(), content: input.trim() }]
  }
  if (typeof input === "object") {
    const obj = input as any
    if (Array.isArray(obj.parts)) return extractUserMessageParts(obj.parts)
    if (typeof obj.content === "string")
      return [{ type: "text", text: obj.content, content: obj.content }]
    if (typeof obj.text === "string")
      return [{ type: "text", text: obj.text, content: obj.text }]
  }
  return []
}

export function deriveTitle(input: unknown): string {
  const parts = extractUserMessageParts(input)
  const text = parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ")
    .trim()
    .slice(0, 60)
  return text || DEFAULT_CONVERSATION_TITLE
}

export async function findConversation(
  threadId: string,
  organizationId: string
): Promise<ConversationRow | null> {
  if (!isUuid(threadId)) return null
  const [row] = await db
    .select()
    .from(chatConversation)
    .where(
      and(
        eq(chatConversation.id, threadId.trim()),
        eq(chatConversation.organizationId, organizationId)
      )
    )
    .limit(1)
  return row ?? null
}

export async function findConversationById(
  threadId: string
): Promise<ConversationRow | null> {
  if (!isUuid(threadId)) return null
  const [row] = await db
    .select()
    .from(chatConversation)
    .where(eq(chatConversation.id, threadId.trim()))
    .limit(1)
  return row ?? null
}

/**
 * Resolves the conversation for a turn: existing thread (org-verified) or a
 * fresh row. Returns `{ conversation, isNew }`.
 */
export async function resolveOrCreateConversation(options: {
  threadId?: string | null
  organizationId: string
  userId: string
  model?: string | null
}): Promise<{ conversation: ConversationRow; isNew: boolean }> {
  const { threadId, organizationId, userId, model } = options
  const validThreadId = threadId && isUuid(threadId) ? threadId.trim() : null
  if (validThreadId) {
    const existing = await findConversation(validThreadId, organizationId)
    if (existing) return { conversation: existing, isNew: false }
  }

  const [row] = await db
    .insert(chatConversation)
    .values({
      ...(validThreadId ? { id: validThreadId } : {}),
      organizationId,
      createdById: userId,
      model: model ?? null,
    })
    .returning()
  if (!row) throw new Error("Failed to create conversation")
  return { conversation: row, isNew: true }
}

export async function countMessages(conversationId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(chatMessage)
    .where(eq(chatMessage.conversationId, conversationId))
  return Number(row?.total ?? 0)
}

/** Inserts the user message; derives + persists the conversation title on the first message. */
export async function appendUserMessage(options: {
  conversationId: string
  organizationId: string
  parts: unknown[]
  model?: string | null
}): Promise<void> {
  const { conversationId, organizationId, parts } = options
  const [existing] = await db
    .select()
    .from(chatConversation)
    .where(eq(chatConversation.id, conversationId))
    .limit(1)

  const userParts = extractUserMessageParts(parts)

  await db.transaction(async (tx) => {
    await tx.insert(chatMessage).values({
      conversationId,
      organizationId,
      role: "user",
      parts: userParts,
      model: options.model ?? null,
    })

    const title = deriveTitle(userParts)
    if (
      existing &&
      (existing.title === DEFAULT_CONVERSATION_TITLE || !existing.title) &&
      title !== DEFAULT_CONVERSATION_TITLE
    ) {
      await tx
        .update(chatConversation)
        .set({ title, updatedAt: new Date() })
        .where(eq(chatConversation.id, conversationId))
    } else {
      await tx
        .update(chatConversation)
        .set({ updatedAt: new Date() })
        .where(eq(chatConversation.id, conversationId))
    }
  })
}

export async function persistAssistantMessage(options: {
  conversationId: string
  organizationId: string
  parts: unknown[]
  status?: "complete" | "interrupted" | "error"
  model?: string | null
}): Promise<void> {
  await db.insert(chatMessage).values({
    conversationId: options.conversationId,
    organizationId: options.organizationId,
    role: "assistant",
    parts: parseMessageParts(options.parts),
    status: options.status ?? "complete",
    model: options.model ?? null,
  })
  await db
    .update(chatConversation)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversation.id, options.conversationId))
}

/**
 * Regenerate semantics (03-§4 step 4): deletes the most recent assistant
 * message of the conversation (leaving the user message) so the turn can re-run.
 * Returns true when a message was removed.
 */
export async function deleteLastAssistantMessage(
  conversationId: string
): Promise<boolean> {
  const [last] = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.conversationId, conversationId))
    .orderBy(desc(chatMessage.createdAt))
    .limit(1)
  if (!last || last.role !== "assistant") return false

  await db.delete(chatMessage).where(eq(chatMessage.id, last.id))
  await db
    .update(chatConversation)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversation.id, conversationId))
  return true
}

export async function listMessages(
  conversationId: string,
  organizationId: string
): Promise<MessageRow[]> {
  return (await db
    .select()
    .from(chatMessage)
    .where(
      and(
        eq(chatMessage.conversationId, conversationId),
        eq(chatMessage.organizationId, organizationId)
      )
    )
    .orderBy(chatMessage.createdAt)) as MessageRow[]
}

export function serializeConversation(
  row: ConversationRow,
  messageCount: number
) {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    updatedAt: row.updatedAt.toISOString(),
    messageCount,
  }
}

export async function logPersistenceError(
  operation: string,
  err: unknown
): Promise<void> {
  logger.error({ err, operation }, `chat persistence ${operation} failed`)
}

/**
 * Persists the outcome of a resolved action approval back into the assistant
 * message parts: replaces the `approval-requested` part with a paired
 * `tool-result` part so reloads render the actual outcome and the next turn
 * feeds the real result (never `{}`) into the model history.
 * No-op when the message was already rewritten (e.g. retried execution).
 */
export async function persistApprovalResolution(options: {
  approvalId: string
  conversationId: string
  organizationId: string
  toolName: string
  result: unknown
  isError: boolean
}): Promise<void> {
  const {
    approvalId,
    conversationId,
    organizationId,
    toolName,
    result,
    isError,
  } = options

  const messages = await db
    .select()
    .from(chatMessage)
    .where(
      and(
        eq(chatMessage.conversationId, conversationId),
        eq(chatMessage.organizationId, organizationId),
        eq(chatMessage.role, "assistant")
      )
    )
    .orderBy(desc(chatMessage.createdAt))

  for (const msg of messages) {
    const parts = (msg.parts ?? []) as any[]
    const approvalIdx = parts.findIndex(
      (p) =>
        p?.type === "approval-requested" &&
        String(p.approvalId ?? p.resumeId ?? "") === approvalId
    )
    if (approvalIdx === -1) continue

    const approvalPart = parts[approvalIdx] as any
    const resolvedToolName = approvalPart.toolName ?? toolName
    const callId =
      approvalPart.callId ??
      approvalPart.toolCallId ??
      (
        parts
          .slice(0, approvalIdx)
          .reverse()
          .find(
            (p) => p?.type === "tool-call" && p.toolName === resolvedToolName
          ) as any
      )?.toolCallId

    const newToolResult = {
      type: "tool-result",
      toolCallId: callId ?? crypto.randomUUID(),
      toolName: resolvedToolName,
      result,
      isError,
    }

    const updatedParts = parts.map((p, i) =>
      i === approvalIdx ? newToolResult : p
    )

    await db
      .update(chatMessage)
      .set({ parts: parseMessageParts(updatedParts) })
      .where(eq(chatMessage.id, msg.id))
    return
  }
}
