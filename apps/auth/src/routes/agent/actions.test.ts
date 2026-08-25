import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { db, eq, schema } from "@workspace/database"
import { logger } from "@workspace/logger"
import { app } from "../../index"

describe("agent action resolution telemetry redaction", () => {
  let orgId: string
  let userId: string
  let conversationId: string
  let dbAvailable = false

  const ctx = {
    organizationId: "",
    userId: "",
    userEmail: "kernel@test.local",
    orgName: "Kernel Test Org",
  }

  let capturedEvents: any[] = []
  const originalInfo = logger.info.bind(logger)

  beforeAll(async () => {
    try {
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
          title: "Kernel Telemetry Conversation",
        })
        .returning({ id: schema.chatConversation.id })
      conversationId = conversation.id
      dbAvailable = true
    } catch {
      dbAvailable = false
    }
  })

  afterAll(async () => {
    logger.info = originalInfo
    if (!dbAvailable) return
    try {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgId))
      await db.delete(schema.user).where(eq(schema.user.id, userId))
    } catch {
      // Ignore cleanup error
    }
  })

  test("agent.action.resolved wide event records feedbackProvided without raw feedback text", async () => {
    if (!dbAvailable) return

    const SENSITIVE_MARKER =
      "confidential-audit-marker-7f3a SSN 123-45-6789 customer ledger"
    const approvalId = crypto.randomUUID()

    await db.insert(schema.chatActionApproval).values({
      id: approvalId,
      organizationId: orgId,
      conversationId,
      toolName: "create_deal",
      toolArgs: { title: "Telemetry Redaction Deal" },
      summary: "Create deal: Telemetry Redaction Deal",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    capturedEvents = []
    logger.info = ((obj: unknown, msg?: string) => {
      capturedEvents.push(obj)
      return originalInfo(obj, msg)
    }) as typeof logger.info

    try {
      const res = await app.fetch(
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
              feedback: SENSITIVE_MARKER,
            }),
          }
        )
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.status).toBe("rejected")

      const resolvedEvent = capturedEvents.find(
        (e) => e?.event === "agent.action.resolved"
      )
      expect(resolvedEvent).toBeDefined()
      expect(resolvedEvent.metadata.approved).toBe(false)

      // Raw user feedback must never enter logs
      expect(JSON.stringify(resolvedEvent)).not.toContain(SENSITIVE_MARKER)
      expect(resolvedEvent.metadata.feedback).toBeUndefined()

      // Presence must still be observable for diagnostics
      expect(resolvedEvent.metadata.feedbackProvided).toBe(true)
    } finally {
      logger.info = originalInfo
    }
  })

  test("agent.action.resolved reports feedbackProvided false when no feedback given", async () => {
    if (!dbAvailable) return

    const approvalId = crypto.randomUUID()
    await db.insert(schema.chatActionApproval).values({
      id: approvalId,
      organizationId: orgId,
      conversationId,
      toolName: "create_deal",
      toolArgs: { title: "No Feedback Deal" },
      summary: "Create deal: No Feedback Deal",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    capturedEvents = []
    logger.info = ((obj: unknown, msg?: string) => {
      capturedEvents.push(obj)
      return originalInfo(obj, msg)
    }) as typeof logger.info

    try {
      const res = await app.fetch(
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

      expect(res.status).toBe(200)

      const resolvedEvent = capturedEvents.find(
        (e) => e?.event === "agent.action.resolved"
      )
      expect(resolvedEvent).toBeDefined()
      expect(resolvedEvent.metadata.approved).toBe(true)
      expect(resolvedEvent.metadata.feedbackProvided).toBe(false)
    } finally {
      logger.info = originalInfo
    }
  })

  test("whitespace-only feedback counts as not provided", async () => {
    if (!dbAvailable) return

    const approvalId = crypto.randomUUID()
    await db.insert(schema.chatActionApproval).values({
      id: approvalId,
      organizationId: orgId,
      conversationId,
      toolName: "create_deal",
      toolArgs: { title: "Whitespace Feedback Deal" },
      summary: "Create deal: Whitespace Feedback Deal",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    capturedEvents = []
    logger.info = ((obj: unknown, msg?: string) => {
      capturedEvents.push(obj)
      return originalInfo(obj, msg)
    }) as typeof logger.info

    try {
      const res = await app.fetch(
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
            body: JSON.stringify({ approved: false, feedback: "   " }),
          }
        )
      )

      expect(res.status).toBe(200)

      const resolvedEvent = capturedEvents.find(
        (e) => e?.event === "agent.action.resolved"
      )
      expect(resolvedEvent).toBeDefined()
      expect(resolvedEvent.metadata.feedbackProvided).toBe(false)
    } finally {
      logger.info = originalInfo
    }
  })
})
