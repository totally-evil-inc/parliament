import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { db, eq, schema } from "@workspace/database"

import {
  appendUserMessage,
  deleteLastAssistantMessage,
  findConversation,
  listMessages,
  persistAssistantMessage,
  resolveOrCreateConversation,
} from "./persist"

describe("agent persistence (real DB, org-scoped)", () => {
  let orgId: string
  let orgId2: string
  let userId: string

  const conversationIds: string[] = []

  beforeAll(async () => {
    const now = new Date()
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Persist Test Org",
        slug: `persist-test-org-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    orgId = org.id

    const [org2] = await db
      .insert(schema.organization)
      .values({
        name: "Persist Test Org 2",
        slug: `persist-test-org-2-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    orgId2 = org2.id

    const [user] = await db
      .insert(schema.user)
      .values({
        name: "Persist Tester",
        email: `persist-${crypto.randomUUID()}@test.local`,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    userId = user.id

    await db.insert(schema.member).values({
      organizationId: orgId,
      userId,
      role: "owner",
      createdAt: now,
    })
    await db.insert(schema.member).values({
      organizationId: orgId2,
      userId,
      role: "member",
      createdAt: now,
    })
  })

  afterAll(async () => {
    if (conversationIds.length > 0) {
      await db
        .delete(schema.chatConversation)
        .where(eq(schema.chatConversation.id, conversationIds[0]))
    }
    if (orgId2) {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgId2))
    }
    if (orgId) {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgId))
    }
    if (userId) {
      await db.delete(schema.user).where(eq(schema.user.id, userId))
    }
  })

  test("resolveOrCreateConversation creates a row and resolves it by threadId", async () => {
    const { conversation, isNew } = await resolveOrCreateConversation({
      organizationId: orgId,
      userId,
      model: "anthropic/claude-sonnet-4",
    })
    expect(isNew).toBe(true)
    expect(conversation.organizationId).toBe(orgId)
    conversationIds.push(conversation.id)

    const resolved = await resolveOrCreateConversation({
      threadId: conversation.id,
      organizationId: orgId,
      userId,
    })
    expect(resolved.conversation.id).toBe(conversation.id)
    expect(resolved.isNew).toBe(false)
  })

  test("appendUserMessage derives the title from the first user text", async () => {
    const { conversation } = await resolveOrCreateConversation({
      organizationId: orgId,
      userId,
    })
    conversationIds.push(conversation.id)

    await appendUserMessage({
      conversationId: conversation.id,
      organizationId: orgId,
      parts: [{ type: "text", text: "How is my pipeline looking this month?" }],
    })

    const [row] = await db
      .select({ title: schema.chatConversation.title })
      .from(schema.chatConversation)
      .where(eq(schema.chatConversation.id, conversation.id))
    expect(row?.title).toBe("How is my pipeline looking this month?")
  })

  test("persistAssistantMessage appends parts and bumps the conversation", async () => {
    const { conversation } = await resolveOrCreateConversation({
      organizationId: orgId,
      userId,
    })
    conversationIds.push(conversation.id)
    await appendUserMessage({
      conversationId: conversation.id,
      organizationId: orgId,
      parts: [{ type: "text", text: "hi" }],
    })
    await persistAssistantMessage({
      conversationId: conversation.id,
      organizationId: orgId,
      parts: [
        { type: "text", text: "here are your numbers" },
        { type: "thinking", thinking: "computed" },
      ],
      status: "complete",
    })

    const messages = await listMessages(conversation.id, orgId)
    expect(messages).toHaveLength(2)
    expect(messages[1].parts).toHaveLength(2)
    expect(messages[1].status).toBe("complete")
  })

  test("deleteLastAssistantMessage removes only the assistant turn (regenerate)", async () => {
    const { conversation } = await resolveOrCreateConversation({
      organizationId: orgId,
      userId,
    })
    conversationIds.push(conversation.id)
    await appendUserMessage({
      conversationId: conversation.id,
      organizationId: orgId,
      parts: [{ type: "text", text: "regenerate me" }],
    })
    await persistAssistantMessage({
      conversationId: conversation.id,
      organizationId: orgId,
      parts: [{ type: "text", text: "first attempt" }],
    })
    await persistAssistantMessage({
      conversationId: conversation.id,
      organizationId: orgId,
      parts: [{ type: "text", text: "second attempt" }],
    })

    const removed = await deleteLastAssistantMessage(conversation.id)
    expect(removed).toBe(true)

    const messages = await listMessages(conversation.id, orgId)
    expect(messages).toHaveLength(2)
    expect(messages[1].parts[0]).toMatchObject({ text: "first attempt" })

    const removedAgain = await deleteLastAssistantMessage(conversation.id)
    expect(removedAgain).toBe(true)
    const removedThrice = await deleteLastAssistantMessage(conversation.id)
    expect(removedThrice).toBe(false)
  })

  test("findConversation refuses cross-org access", async () => {
    const { conversation } = await resolveOrCreateConversation({
      organizationId: orgId,
      userId,
    })
    conversationIds.push(conversation.id)

    const sameOrg = await findConversation(conversation.id, orgId)
    expect(sameOrg).not.toBeNull()

    const crossOrg = await findConversation(conversation.id, orgId2)
    expect(crossOrg).toBeNull()
  })
})
