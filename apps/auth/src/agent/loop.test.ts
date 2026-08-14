import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { and, db, eq, schema } from "@workspace/database"
import { runAgentTurn } from "./loop"
import { MockTextAdapter } from "./mock-adapter"
import { listMessages } from "./persist"
import type { AgentContext } from "./tool-ctx"

describe("agent loop (apps/auth, mock adapter, real chat engine)", () => {
  let orgId: string
  let userId: string
  const conversationIds: string[] = []

  const ctx: AgentContext = {
    organizationId: "",
    userId: "",
    userEmail: "loop@test.local",
    orgName: "Loop Test Org",
  }

  beforeAll(async () => {
    const now = new Date()
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Loop Test Org",
        slug: `loop-test-org-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    orgId = org.id
    ctx.organizationId = orgId

    const [user] = await db
      .insert(schema.user)
      .values({
        id: "00000000-0000-7000-8000-000000000001",
        name: "Loop Tester",
        email: `loop-${crypto.randomUUID()}@test.local`,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    userId = user.id
    ctx.userId = userId

    await db.insert(schema.member).values({
      organizationId: orgId,
      userId,
      role: "owner",
      createdAt: now,
    })
  })

  afterAll(async () => {
    for (const id of conversationIds) {
      await db
        .delete(schema.chatConversation)
        .where(eq(schema.chatConversation.id, id))
    }
    await db
      .delete(schema.organization)
      .where(eq(schema.organization.id, orgId))
    await db.delete(schema.user).where(eq(schema.user.id, userId))
  })

  const userMessage = {
    id: "u-1",
    role: "user",
    parts: [{ type: "text", text: "Hello agent" }],
  }

  async function drain(response: Response): Promise<string> {
    return await response.text()
  }

  test("tool turn: SSE stream carries tool events and assistant message is persisted complete", async () => {
    const adapter = new MockTextAdapter("tool-turn")
    const { conversation, response, model } = await runAgentTurn(ctx, {
      messages: [userMessage],
      adapter,
    })
    conversationIds.push(conversation.id)
    expect(model).toBe("")

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/event-stream")
    const wire = await drain(response)
    expect(wire).toContain('"TEXT_MESSAGE_CONTENT"')
    expect(wire).toContain('"TOOL_CALL_START"')
    expect(wire).toContain('"TOOL_CALL_RESULT"')
    expect(wire).toContain('"RUN_FINISHED"')

    // adapter was invoked twice (model turn 1 = tool call, turn 2 = text)
    expect(adapter.invokedMessages).toHaveLength(2)

    const messages = await listMessages(conversation.id, orgId)
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe("user")
    expect(messages[1].role).toBe("assistant")
    expect(messages[1].status).toBe("complete")

    const parts = messages[1].parts as Array<{ type: string; text?: string }>
    const textParts = parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("")
    expect(textParts).toContain("Let me verify access first.")
    expect(textParts).toContain("Hello world!")
    expect(parts.some((p) => p.type === "tool-call")).toBe(true)
    expect(parts.some((p) => p.type === "tool-result")).toBe(true)

    // the tool actually ran against the real registry impl
    const toolResults = parts.filter((p) => p.type === "tool-result") as Array<{
      result?: { organizationId?: string; organizationName?: string }
    }>
    expect(toolResults[0].result?.organizationId).toBe(orgId)
    expect(toolResults[0].result?.organizationName).toBe("Loop Test Org")
  })

  test("text-only turn persists a plain text assistant message", async () => {
    const { conversation, response } = await runAgentTurn(ctx, {
      messages: [userMessage],
      adapter: new MockTextAdapter("text-turn"),
    })
    conversationIds.push(conversation.id)
    const wire = await drain(response)
    expect(wire).toContain('"delta":"Hello "')
    expect(wire).toContain('"delta":"world!"')

    const messages = await listMessages(conversation.id, orgId)
    expect(messages).toHaveLength(2)
    expect(messages[1].status).toBe("complete")
    const parts = messages[1].parts as Array<{ type: string; text?: string }>
    expect(
      parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("")
    ).toBe("Hello world!")
  })

  test("failing stream persists the assistant message as interrupted", async () => {
    const { conversation, response } = await runAgentTurn(ctx, {
      messages: [userMessage],
      adapter: new MockTextAdapter("failing"),
    })
    conversationIds.push(conversation.id)

    // the adapter throws mid-stream; the SSE encoder absorbs the error into a
    // clean stream termination, and the loop records the turn as interrupted
    await drain(response)

    const messages = await listMessages(conversation.id, orgId)
    expect(messages).toHaveLength(2)
    expect(messages[1].role).toBe("assistant")
    expect(messages[1].status).toBe("interrupted")
  })

  test("regenerate drops the previous assistant message and re-runs", async () => {
    const { conversation, response: firstResponse } = await runAgentTurn(ctx, {
      messages: [userMessage],
      adapter: new MockTextAdapter("text-turn"),
    })
    conversationIds.push(conversation.id)
    await drain(firstResponse)

    const before = await listMessages(conversation.id, orgId)
    expect(before).toHaveLength(2)

    const { response: secondResponse } = await runAgentTurn(ctx, {
      messages: [userMessage],
      threadId: conversation.id,
      regenerate: true,
      adapter: new MockTextAdapter("text-turn"),
    })
    await drain(secondResponse)

    const after = await listMessages(conversation.id, orgId)
    expect(after).toHaveLength(2)
    expect(after[0].role).toBe("user")
    expect(after[1].role).toBe("assistant")

    const userMessages = after.filter((m) => m.role === "user")
    expect(userMessages).toHaveLength(1)

    await db
      .delete(schema.chatMessage)
      .where(and(eq(schema.chatMessage.conversationId, conversation.id)))
  })
})
