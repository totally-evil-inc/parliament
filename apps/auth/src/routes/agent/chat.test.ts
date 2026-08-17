import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test"
import { and, db, eq, schema } from "@workspace/database"

// Route-level test: the OpenAI adapter module is swapped for the mock
// adapter, so the whole stack runs for real — auth middleware → route → chat
// engine → tool execution → persistence — without an API key.
mock.module("@tanstack/ai-openai", () => ({
  createOpenaiChatCompletions: () => new MockTextAdapter("tool-turn"),
}))

import { MockTextAdapter } from "../../agent/mock-adapter"

describe("agent chat route (apps/auth)", () => {
  let app: typeof import("../../index").app
  let orgId: string
  let userId: string

  beforeAll(async () => {
    const { app: loaded } = await import("../../index")
    app = loaded

    const now = new Date()
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Chat Route Org",
        slug: `chat-route-org-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    orgId = org.id

    const [user] = await db
      .insert(schema.user)
      .values({
        id: "00000000-0000-7000-8000-000000000001",
        name: "Chat Tester",
        email: `chat-${crypto.randomUUID()}@test.local`,
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

    await db.insert(schema.aiSettings).values({
      organizationId: orgId,
      name: "Default",
      apiKey: "sk-test",
      baseUrl: "https://openrouter.ai/api/v1",
      defaultModel: "anthropic/claude-sonnet-4",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  })

  afterAll(async () => {
    if (orgId) {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgId))
    }
    if (userId) {
      await db.delete(schema.user).where(eq(schema.user.id, userId))
    }
  })

  const withSession = (email: string) => ({
    headers: {
      "x-test-session-email": email,
      "x-test-org-id": orgId,
      "Content-Type": "application/json",
    },
  })

  const userMessage = {
    id: "u-1",
    role: "user",
    parts: [{ type: "text", text: "Who am I acting for?" }],
  }

  test("401 without a session", async () => {
    const res = await app.request("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [userMessage] }),
    })
    expect(res.status).toBe(401)
  })

  test("422 on an invalid body", async () => {
    const email = `chat-${crypto.randomUUID()}@test.local`
    const res = await app.request("/api/agent/chat", {
      method: "POST",
      ...withSession(email),
      body: JSON.stringify({ messages: [] }),
    })
    expect(res.status).toBe(422)
  })

  test("403 with a cross-org threadId", async () => {
    const email = `chat-${crypto.randomUUID()}@test.local`

    const [foreignOrg] = await db
      .insert(schema.organization)
      .values({
        name: "Foreign Chat Org",
        slug: `foreign-chat-${crypto.randomUUID()}`,
        createdAt: new Date(),
      })
      .returning()
    try {
      const [conversation] = await db
        .insert(schema.chatConversation)
        .values({
          organizationId: foreignOrg.id,
          title: "theirs",
        })
        .returning()

      const res = await app.request("/api/agent/chat", {
        method: "POST",
        ...withSession(email),
        body: JSON.stringify({
          messages: [userMessage],
          threadId: conversation.id,
        }),
      })
      expect(res.status).toBe(403)
    } finally {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, foreignOrg.id))
    }
  })

  test("full turn: SSE streamed reply is persisted for the org member", async () => {
    const email = `chat-${crypto.randomUUID()}@test.local`

    const res = await app.request("/api/agent/chat", {
      method: "POST",
      ...withSession(email),
      body: JSON.stringify({
        messages: [userMessage],
        forwardedProps: { model: "anthropic/claude-sonnet-4" },
      }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const wire = await res.text()
    expect(wire).toContain('"TOOL_CALL_START"')
    expect(wire).toContain('"TOOL_CALL_RESULT"')
    expect(wire).toContain('"delta":"Hello "')
    expect(wire).toContain('"delta":"world!"')

    const [conversation] = await db
      .select({ id: schema.chatConversation.id })
      .from(schema.chatConversation)
      .where(eq(schema.chatConversation.organizationId, orgId))
      .limit(1)

    expect(conversation).toBeDefined()
    const [model] = await db
      .select({ model: schema.chatConversation.model })
      .from(schema.chatConversation)
      .where(eq(schema.chatConversation.id, conversation.id))
    expect(model.model).toBe("anthropic/claude-sonnet-4")

    const messages = await db
      .select()
      .from(schema.chatMessage)
      .where(
        and(
          eq(schema.chatMessage.conversationId, conversation.id),
          eq(schema.chatMessage.organizationId, orgId)
        )
      )
      .orderBy(schema.chatMessage.createdAt)

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe("user")
    expect(messages[1].role).toBe("assistant")
    expect(messages[1].status).toBe("complete")

    const parts = messages[1].parts as Array<{ type: string }>
    expect(parts.some((p) => p.type === "tool-result")).toBe(true)

    await db
      .delete(schema.chatConversation)
      .where(eq(schema.chatConversation.id, conversation.id))
  })
})
