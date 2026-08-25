import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import type { MessagePartJson } from "@workspace/agent/message-parts"
import { and, db, eq, schema } from "@workspace/database"
import { app } from "../../index"

describe("agent history API (apps/auth)", () => {
  let orgId: string
  let userId: string
  const TEST_USER_ID = "00000000-0000-7000-8000-000000000001"

  beforeAll(async () => {
    const now = new Date()
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "History API Org",
        slug: `history-api-org-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    orgId = org.id

    const [user] = await db
      .insert(schema.user)
      .values({
        id: TEST_USER_ID,
        name: "History Tester",
        email: `history-${crypto.randomUUID()}@test.local`,
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

  test("401 without a session", async () => {
    const res = await app.request("/api/agent/conversations")
    expect(res.status).toBe(401)
  })

  test("full CRUD lifecycle works for the org member", async () => {
    const email = `history-${crypto.randomUUID()}@test.local`

    // create
    const createRes = await app.request("/api/agent/conversations", {
      method: "POST",
      ...withSession(email),
      body: JSON.stringify({ model: "anthropic/claude-sonnet-4" }),
    })
    expect(createRes.status).toBe(201)
    const { id } = (await createRes.json()) as { id: string }

    // seed one message so messageCount is meaningful
    await db.insert(schema.chatMessage).values({
      conversationId: id,
      organizationId: orgId,
      role: "user",
      parts: [{ type: "text", text: "seeded" }] as MessagePartJson[],
    })

    // list
    const listRes = await app.request(
      "/api/agent/conversations",
      withSession(email)
    )
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as {
      conversations: Array<{ id: string; title: string; messageCount: number }>
    }
    const found = listBody.conversations.find((c) => c.id === id)
    expect(found).toBeDefined()
    expect(found?.messageCount).toBe(1)

    // get with messages
    const getRes = await app.request(
      `/api/agent/conversations/${id}`,
      withSession(email)
    )
    expect(getRes.status).toBe(200)
    const getBody = (await getRes.json()) as {
      conversation: { id: string }
      messages: Array<{ role: string; parts: unknown[] }>
    }
    expect(getBody.conversation.id).toBe(id)
    expect(getBody.messages).toHaveLength(1)
    expect(getBody.messages[0].role).toBe("user")

    // rename
    const patchRes = await app.request(`/api/agent/conversations/${id}`, {
      method: "PATCH",
      ...withSession(email),
      body: JSON.stringify({ title: "Renamed thread" }),
    })
    expect(patchRes.status).toBe(200)
    const patchBody = (await patchRes.json()) as {
      title: string
      pinned: boolean
    }
    expect(patchBody.title).toBe("Renamed thread")

    // pin conversation
    const pinRes = await app.request(`/api/agent/conversations/${id}`, {
      method: "PATCH",
      ...withSession(email),
      body: JSON.stringify({ pinned: true }),
    })
    expect(pinRes.status).toBe(200)
    const pinBody = (await pinRes.json()) as { pinned: boolean }
    expect(pinBody.pinned).toBe(true)

    // rename preserves pinned status
    const renamePreserveRes = await app.request(
      `/api/agent/conversations/${id}`,
      {
        method: "PATCH",
        ...withSession(email),
        body: JSON.stringify({ title: "Second Title" }),
      }
    )
    expect(renamePreserveRes.status).toBe(200)
    const renamePreserveBody = (await renamePreserveRes.json()) as {
      title: string
      pinned: boolean
    }
    expect(renamePreserveBody.title).toBe("Second Title")
    expect(renamePreserveBody.pinned).toBe(true)

    // unpin conversation
    const unpinRes = await app.request(`/api/agent/conversations/${id}`, {
      method: "PATCH",
      ...withSession(email),
      body: JSON.stringify({ pinned: false }),
    })
    expect(unpinRes.status).toBe(200)
    const unpinBody = (await unpinRes.json()) as { pinned: boolean }
    expect(unpinBody.pinned).toBe(false)

    // non-uuid parameter returns 404 defensively
    const nonUuidGet = await app.request(
      "/api/agent/conversations/not-a-uuid-123",
      withSession(email)
    )
    expect(nonUuidGet.status).toBe(404)

    const nonUuidPatch = await app.request(
      "/api/agent/conversations/not-a-uuid-123",
      {
        method: "PATCH",
        ...withSession(email),
        body: JSON.stringify({ title: "Nope" }),
      }
    )
    expect(nonUuidPatch.status).toBe(404)

    const nonUuidDel = await app.request(
      "/api/agent/conversations/not-a-uuid-123",
      { method: "DELETE", ...withSession(email) }
    )
    expect(nonUuidDel.status).toBe(404)

    // empty patch payload returns 400
    const emptyPatch = await app.request(`/api/agent/conversations/${id}`, {
      method: "PATCH",
      ...withSession(email),
      body: JSON.stringify({}),
    })
    expect(emptyPatch.status).toBe(400)

    // delete
    const delRes = await app.request(`/api/agent/conversations/${id}`, {
      method: "DELETE",
      ...withSession(email),
    })
    expect(delRes.status).toBe(200)
  })

  test("cross-org thread id returns 404 (org scoping)", async () => {
    const email = `history-${crypto.randomUUID()}@test.local`

    // another org not containing this user
    const [foreignOrg] = await db
      .insert(schema.organization)
      .values({
        name: "Foreign Org",
        slug: `foreign-org-${crypto.randomUUID()}`,
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

      const res = await app.request(
        `/api/agent/conversations/${conversation.id}`,
        withSession(email)
      )
      expect(res.status).toBe(404)

      const delRes = await app.request(
        `/api/agent/conversations/${conversation.id}`,
        { method: "DELETE", ...withSession(email) }
      )
      expect(delRes.status).toBe(404)
    } finally {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, foreignOrg.id))
    }
  })

  test("historical conversation survives with messages in asc order", async () => {
    const email = `history-${crypto.randomUUID()}@test.local`

    const [conversation] = await db
      .insert(schema.chatConversation)
      .values({
        organizationId: orgId,
        title: "Ordered thread",
      })
      .returning()

    await db.insert(schema.chatMessage).values([
      {
        conversationId: conversation.id,
        organizationId: orgId,
        role: "assistant",
        parts: [{ type: "text", text: "second" }] as MessagePartJson[],
        createdAt: new Date(Date.now() + 5000),
      },
      {
        conversationId: conversation.id,
        organizationId: orgId,
        role: "user",
        parts: [{ type: "text", text: "first" }] as MessagePartJson[],
        createdAt: new Date(Date.now() + 1000),
      },
    ])

    const res = await app.request(
      `/api/agent/conversations/${conversation.id}`,
      withSession(email)
    )
    const body = (await res.json()) as {
      messages: Array<{ parts: Array<{ text?: string }> }>
    }
    expect(body.messages.map((m) => m.parts[0].text)).toEqual([
      "first",
      "second",
    ])

    await db
      .delete(schema.chatConversation)
      .where(
        and(
          eq(schema.chatConversation.id, conversation.id),
          eq(schema.chatConversation.organizationId, orgId)
        )
      )
  })
})
