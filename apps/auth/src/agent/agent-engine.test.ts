import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { db, eq, schema } from "@workspace/database"
import { app } from "../index"
import { AgentEngine } from "./agent-engine"
import { ContextGovernor } from "./context-governor"
import type { AgentContext } from "./tool-ctx"
import { ToolDispatcher } from "./tool-dispatcher"

describe("AgentEngine FSM & ContextGovernor", () => {
  let orgId: string
  let userId: string
  let conversationId: string

  const ctx: AgentContext = {
    organizationId: "",
    userId: "",
    userEmail: "kernel@test.local",
    orgName: "Kernel Test Org",
  }

  beforeAll(async () => {
    const now = new Date()
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Kernel Test Org",
        slug: `kernel-test-org-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    orgId = org.id
    ctx.organizationId = orgId

    const [user] = await db
      .insert(schema.user)
      .values({
        id: crypto.randomUUID(),
        name: "Kernel Tester",
        email: `kernel-${crypto.randomUUID()}@test.local`,
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

    const [conversation] = await db
      .insert(schema.chatConversation)
      .values({
        organizationId: orgId,
        createdById: userId,
        title: "Kernel Test Conversation",
      })
      .returning({ id: schema.chatConversation.id })
    conversationId = conversation.id
  })

  afterAll(async () => {
    await db
      .delete(schema.organization)
      .where(eq(schema.organization.id, orgId))
    await db.delete(schema.user).where(eq(schema.user.id, userId))
  })

  test("ContextGovernor compacts tool output when exceeding inline limit (Spill-to-Blob)", async () => {
    const governor = new ContextGovernor({
      maxInlineToolChars: 100,
      slidingWindowTurns: 5,
    })
    const largeResult = {
      deals: Array.from({ length: 50 }, (_, i) => ({
        id: `deal-${i}`,
        title: `Big Enterprise Deal ${i} with long description and milestone requirements`,
      })),
    }

    const convId = conversationId
    const { content, spilled, artifactId } = await governor.processToolResult({
      toolName: "list_deals",
      rawResult: largeResult,
      organizationId: orgId,
      conversationId: convId,
    })

    expect(spilled).toBe(true)
    expect(artifactId).toBeDefined()
    expect(content).toContain(
      "[OUTPUT OVERFLOW TRUNCATED — SPILLED TO ARTIFACT STORE]"
    )
    expect(content).toContain(`artifact://${artifactId}`)
  })

  test("ContextGovernor applies sliding window while preserving user goal", () => {
    const governor = new ContextGovernor({
      maxInlineToolChars: 4800,
      slidingWindowTurns: 2,
    })
    const messages: any[] = [
      { role: "user", content: "Initial project goal: Build invoicing portal" },
      { role: "assistant", content: "Got it, checking deals..." },
      { role: "user", content: "Turn 1 question" },
      { role: "assistant", content: "Turn 1 answer" },
      { role: "user", content: "Turn 2 question" },
      { role: "assistant", content: "Turn 2 answer" },
      { role: "user", content: "Turn 3 question" },
      { role: "assistant", content: "Turn 3 answer" },
    ]

    const compacted = governor.compactMessages(messages)
    // Should preserve initial user message + last 4 messages (slidingWindowTurns * 2)
    expect(compacted[0].content).toBe(
      "Initial project goal: Build invoicing portal"
    )
    expect(compacted.length).toBeLessThanOrEqual(5)
  })

  test("Action approval endpoints manage pending approvals and resolution lifecycle", async () => {
    const approvalId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // 1. Insert pending action approval
    await db.insert(schema.chatActionApproval).values({
      id: approvalId,
      organizationId: orgId,
      conversationId,
      toolName: "create_deal",
      toolArgs: { title: "Dunder Mifflin Deal", valueMinorUnits: 500000 },
      summary: "Create deal: Dunder Mifflin Deal",
      status: "pending",
      expiresAt,
    })

    // 2. Reject action
    const rejectRes = await app.fetch(
      new Request(
        `http://localhost:4000/api/agent/actions/${approvalId}/resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-session-email": "kernel@test.local",
            "x-test-org-id": orgId,
            "x-test-user-id": userId,
          },
          body: JSON.stringify({
            approved: false,
            feedback: "Budget exceeded",
          }),
        }
      )
    )

    expect(rejectRes.status).toBe(200)
    const rejectData = (await rejectRes.json()) as any
    expect(rejectData.status).toBe("rejected")
    expect(rejectData.result.message).toContain("Budget exceeded")

    // 3. Trying to resolve again should return 409 Conflict
    const secondRes = await app.fetch(
      new Request(
        `http://localhost:4000/api/agent/actions/${approvalId}/resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-session-email": "kernel@test.local",
            "x-test-org-id": orgId,
            "x-test-user-id": userId,
          },
          body: JSON.stringify({ approved: true }),
        }
      )
    )
    expect(secondRes.status).toBe(409)

    // 4. Non-UUID action ID should safely return 404 Not Found without crashing or org hijacking
    const nonUuidRes = await app.fetch(
      new Request(
        "http://localhost:4000/api/agent/actions/call_12345/resolve",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-session-email": "kernel@test.local",
            "x-test-org-id": orgId,
            "x-test-user-id": userId,
          },
          body: JSON.stringify({ approved: true }),
        }
      )
    )
    expect(nonUuidRes.status).toBe(404)

    // 5. Non-existent random UUID should return 404 Not Found
    const missingUuidRes = await app.fetch(
      new Request(
        `http://localhost:4000/api/agent/actions/${crypto.randomUUID()}/resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-session-email": "kernel@test.local",
            "x-test-org-id": orgId,
            "x-test-user-id": userId,
          },
          body: JSON.stringify({ approved: true }),
        }
      )
    )
    expect(missingUuidRes.status).toBe(404)

    // 6. Expired action approval should atomically transition and return 410 Gone
    const expiredApprovalId = crypto.randomUUID()
    const pastDate = new Date(Date.now() - 60000) // 1 minute in the past
    await db.insert(schema.chatActionApproval).values({
      id: expiredApprovalId,
      organizationId: orgId,
      conversationId,
      toolName: "create_deal",
      toolArgs: { title: "Expired Deal" },
      summary: "Create deal: Expired Deal",
      status: "pending",
      expiresAt: pastDate,
    })

    const expiredRes = await app.fetch(
      new Request(
        `http://localhost:4000/api/agent/actions/${expiredApprovalId}/resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-session-email": "kernel@test.local",
            "x-test-org-id": orgId,
            "x-test-user-id": userId,
          },
          body: JSON.stringify({ approved: true }),
        }
      )
    )
    expect(expiredRes.status).toBe(410)
    const expiredData = (await expiredRes.json()) as any
    expect(expiredData.error.code).toBe("action_expired")

    // 7. Whitespace-padded valid UUID should resolve successfully
    const whitespaceApprovalId = crypto.randomUUID()
    await db.insert(schema.chatActionApproval).values({
      id: whitespaceApprovalId,
      organizationId: orgId,
      conversationId,
      toolName: "create_deal",
      toolArgs: { title: "Whitespace Deal" },
      summary: "Create deal: Whitespace Deal",
      status: "pending",
      expiresAt,
    })

    const whitespaceRes = await app.fetch(
      new Request(
        `http://localhost:4000/api/agent/actions/  ${whitespaceApprovalId}  /resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-session-email": "kernel@test.local",
            "x-test-org-id": orgId,
            "x-test-user-id": userId,
          },
          body: JSON.stringify({
            approved: false,
            feedback: "Whitespace test",
          }),
        }
      )
    )
    expect(whitespaceRes.status).toBe(200)
  })

  test("approval-gated CRM tools require approval without the bypass flag", async () => {
    const dispatcher = new ToolDispatcher(ctx)
    const gated = await dispatcher.executeTool("create_customer", {
      name: "Acme Co",
    })
    expect(gated.approvalRequired).toBe(true)
    expect(gated.isError).toBe(false)
  })

  test("CRM mutation tools execute through the dispatcher with the gate bypassed", async () => {
    const dispatcher = new ToolDispatcher(ctx)

    const createdCustomer = await dispatcher.executeTool(
      "create_customer",
      { name: "Dunder Mifflin Paper Co" },
      { skipApprovalGate: true }
    )
    expect(createdCustomer.isError).toBe(false)
    const customerId = (createdCustomer.result as any).id
    expect(customerId).toBeDefined()

    const createdDeal = await dispatcher.executeTool(
      "create_deal",
      {
        title: "Dunder Mifflin Enterprise Deal",
        valueMinorUnits: 500000,
        currency: "USD",
        companyId: customerId,
      },
      { skipApprovalGate: true }
    )
    expect(createdDeal.isError).toBe(false)
    const dealId = (createdDeal.result as any).id
    expect(dealId).toBeDefined()

    const staged = await dispatcher.executeTool(
      "update_deal_stage",
      { id: dealId, stage: "proposal_sent" },
      { skipApprovalGate: true }
    )
    expect(staged.isError).toBe(false)
    expect((staged.result as any).stage).toBe("proposal_sent")

    const updated = await dispatcher.executeTool(
      "update_customer",
      { id: customerId, status: "inactive" },
      { skipApprovalGate: true }
    )
    expect(updated.isError).toBe(false)
    expect((updated.result as any).status).toBe("inactive")
  })

  test("AgentEngine strictly omits retryOf when explicit linkage is absent and preserves explicit retryOf", async () => {
    const engine = new AgentEngine({ maxSteps: 2 })

    let stepCount = 0
    const mockModel: any = {
      specificationVersion: "v2",
      provider: "mock",
      modelId: "mock-model",
      defaultObjectGenerationMode: "json",
      async doStream() {
        stepCount++
        const currentStep = stepCount
        const stream = new ReadableStream({
          start(controller) {
            if (currentStep === 1) {
              controller.enqueue({
                type: "tool-call",
                toolCallId: "call-1",
                toolName: "create_deal",
                input: JSON.stringify({
                  title: "Deal 1",
                  valueMinorUnits: 10000,
                }),
              })
              controller.enqueue({
                type: "finish",
                finishReason: "tool-calls",
                usage: { promptTokens: 10, completionTokens: 10 },
              })
            } else if (currentStep === 2) {
              controller.enqueue({
                type: "tool-call",
                toolCallId: "call-2",
                toolName: "create_deal",
                input: JSON.stringify({
                  title: "Unrelated Deal 2",
                  valueMinorUnits: 20000,
                }),
              })
              controller.enqueue({
                type: "finish",
                finishReason: "tool-calls",
                usage: { promptTokens: 10, completionTokens: 10 },
              })
            } else {
              controller.enqueue({
                type: "text-delta",
                textDelta: "Done.",
              })
              controller.enqueue({
                type: "finish",
                finishReason: "stop",
                usage: { promptTokens: 10, completionTokens: 10 },
              })
            }
            controller.close()
          },
        })

        return {
          stream,
          rawCall: { rawPrompt: null, rawSettings: {} },
        }
      },
    }

    const events: any[] = []
    const generator = engine.executeTurn({
      ctx: {
        ...ctx,
        organizationId: orgId,
        userId,
      },
      model: mockModel,
      modelName: "mock-model",
      conversationId,
      messages: [{ role: "user", content: "Create two deals" } as any],
    })

    for await (const ev of generator) {
      events.push(ev)
    }

    const toolCalledEvents = events.filter((e) => e.type === "tool:called")
    expect(toolCalledEvents.length).toBeGreaterThanOrEqual(1)

    // Call 1
    expect(toolCalledEvents[0].callId).toBe("call-1")
    expect(toolCalledEvents[0].retryOf).toBeUndefined()
    expect(toolCalledEvents[0].attempt).toBeUndefined()

    if (toolCalledEvents.length > 1) {
      // Call 2 must NOT receive retryOf or attempt from call 1 (no implicit retry inference)
      expect(toolCalledEvents[1].callId).toBe("call-2")
      expect(toolCalledEvents[1].retryOf).toBeUndefined()
      expect(toolCalledEvents[1].attempt).toBeUndefined()
    }
  })

  test("AgentEngine preserves explicit retryOf and attempt when provided by provider/runtime", async () => {
    const engine = new AgentEngine({ maxSteps: 1 })

    const mockModel: any = {
      specificationVersion: "v2",
      provider: "mock",
      modelId: "mock-model",
      defaultObjectGenerationMode: "json",
      async doStream() {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: "tool-call",
              toolCallId: "call-retry-explicit",
              toolName: "create_deal",
              input: JSON.stringify({
                title: "Retried Deal",
                valueMinorUnits: 50000,
              }),
              providerMetadata: {
                retryOf: "call-original-failed",
                attempt: 2,
              },
            })
            controller.enqueue({
              type: "finish",
              finishReason: "tool-calls",
              usage: { promptTokens: 10, completionTokens: 10 },
            })
            controller.close()
          },
        })

        return {
          stream,
          rawCall: { rawPrompt: null, rawSettings: {} },
        }
      },
    }

    const events: any[] = []
    const generator = engine.executeTurn({
      ctx: {
        ...ctx,
        organizationId: orgId,
        userId,
      },
      model: mockModel,
      modelName: "mock-model",
      conversationId,
      messages: [{ role: "user", content: "Retry create deal" } as any],
    })

    for await (const ev of generator) {
      events.push(ev)
    }

    const toolCalled = events.find((e) => e.type === "tool:called")!
    expect(toolCalled).toBeDefined()
    expect(toolCalled.callId).toBe("call-retry-explicit")
    expect(toolCalled.retryOf).toBe("call-original-failed")
    expect(toolCalled.attempt).toBe(2)
  })

  test("AgentEngine treats business tool args named retryOf/attempt as untrusted business data and does not forge retry lineage", async () => {
    const engine = new AgentEngine({ maxSteps: 1 })

    const mockModel: any = {
      specificationVersion: "v2",
      provider: "mock",
      modelId: "mock-model",
      defaultObjectGenerationMode: "json",
      async doStream() {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: "tool-call",
              toolCallId: "call-untrusted-args",
              toolName: "create_deal",
              input: JSON.stringify({
                title: "Deal with fake retry arg",
                valueMinorUnits: 10000,
                retryOf: "forged-prior-call-id",
                attempt: 99,
              }),
            })
            controller.enqueue({
              type: "finish",
              finishReason: "tool-calls",
              usage: { promptTokens: 10, completionTokens: 10 },
            })
            controller.close()
          },
        })

        return {
          stream,
          rawCall: { rawPrompt: null, rawSettings: {} },
        }
      },
    }

    const events: any[] = []
    const generator = engine.executeTurn({
      ctx: {
        ...ctx,
        organizationId: orgId,
        userId,
      },
      model: mockModel,
      modelName: "mock-model",
      conversationId,
      messages: [{ role: "user", content: "Test forged args" } as any],
    })

    for await (const ev of generator) {
      events.push(ev)
    }

    const toolCalled = events.find((e) => e.type === "tool:called")!
    expect(toolCalled).toBeDefined()
    expect(toolCalled.callId).toBe("call-untrusted-args")
    // Untrusted args must not be elevated to lifecycle metadata
    expect(toolCalled.retryOf).toBeUndefined()
    expect(toolCalled.attempt).toBeUndefined()
    expect(toolCalled.args).toMatchObject({
      title: "Deal with fake retry arg",
      valueMinorUnits: 10000,
    })
  })
})
