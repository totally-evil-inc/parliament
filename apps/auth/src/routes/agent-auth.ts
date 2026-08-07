import { and, db, desc, eq } from "@workspace/database"
import { agent, agentAction } from "@workspace/database/schema"
import { logger } from "@workspace/logger"
import { Hono } from "hono"

export const agentAuthRouter = new Hono<{
  Variables: {
    user: any
    session: any
  }
}>()

/**
 * Stage an action proposed by an agent (called by Go Harness daemon)
 */
agentAuthRouter.post("/stage", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { toolName, args, reason, confidenceScore, agentId, userId } = body

  if (!toolName || !args) {
    return c.json({ error: "Bad Request: Missing toolName or args" }, 400)
  }

  try {
    // If agentId is provided, check policy
    let policySetting = "require_approval"
    let targetUserId = userId

    if (agentId) {
      const records = await db
        .select()
        .from(agent)
        .where(eq(agent.id, agentId))
        .limit(1)

      if (records.length > 0) {
        const ag = records[0]
        targetUserId = targetUserId || ag.userId
        if (ag.policy && ag.policy[toolName]) {
          policySetting = ag.policy[toolName]
        }
      }
    }

    if (policySetting === "forbidden") {
      return c.json(
        { error: "Forbidden: Tool execution is blocked by agent policy" },
        403
      )
    }

    if (policySetting === "always_allow") {
      return c.json({
        id: crypto.randomUUID(),
        status: "approved",
        message: "Auto-approved by agent policy",
      })
    }

    // Default to require_approval: stage in DB
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hour expiry

    // Fallback userId lookup if not supplied
    if (!targetUserId) {
      const firstUser = await db.query?.user?.findFirst?.()
      if (firstUser) {
        targetUserId = firstUser.id
      }
    }

    if (!targetUserId) {
      return c.json(
        { error: "Bad Request: No target user available for approval staging" },
        400
      )
    }

    // Fallback dummy agent ID if missing
    let targetAgentId = agentId
    if (!targetAgentId) {
      const existingAgent = await db.select().from(agent).limit(1)
      if (existingAgent.length > 0) {
        targetAgentId = existingAgent[0].id
      } else {
        const [newAgent] = await db
          .insert(agent)
          .values({
            userId: targetUserId,
            name: "Default Harness Agent",
          })
          .returning()
        targetAgentId = newAgent.id
      }
    }

    const [staged] = await db
      .insert(agentAction)
      .values({
        agentId: targetAgentId,
        userId: targetUserId,
        toolName,
        args,
        reason: reason || "Proposed tool action requiring HITL approval",
        confidenceScore: confidenceScore ?? 0.9,
        status: "pending",
        expiresAt,
      })
      .returning()

    logger.info(
      { actionId: staged.id, toolName, userId: targetUserId },
      "Staged high-risk action for HITL approval"
    )

    return c.json({
      id: staged.id,
      status: "pending",
      expiresAt: staged.expiresAt,
    })
  } catch (err: any) {
    logger.error({ err, toolName }, "Error staging agent action")
    return c.json({ error: "Internal Server Error" }, 500)
  }
})

/**
 * Fetch pending actions awaiting user approval
 */
agentAuthRouter.get("/pending", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const pendingList = await db
      .select()
      .from(agentAction)
      .where(
        and(eq(agentAction.userId, user.id), eq(agentAction.status, "pending"))
      )
      .orderBy(desc(agentAction.createdAt))

    return c.json({ pending: pendingList })
  } catch (err: any) {
    logger.error(
      { err, userId: user.id },
      "Error fetching pending agent actions"
    )
    return c.json({ error: "Failed to fetch pending actions" }, 500)
  }
})

/**
 * Check status of a specific action by ID (polled by Go Harness)
 */
agentAuthRouter.get("/actions/:id/status", async (c) => {
  const actionId = c.req.param("id")
  try {
    const records = await db
      .select()
      .from(agentAction)
      .where(eq(agentAction.id, actionId))
      .limit(1)

    if (records.length === 0) {
      return c.json({ error: "Action not found" }, 404)
    }

    const act = records[0]
    return c.json({
      id: act.id,
      status: act.status,
      approvedAt: act.approvedAt,
    })
  } catch (err: any) {
    return c.json({ error: "Failed to check action status" }, 500)
  }
})

/**
 * User approves a pending staged action
 */
agentAuthRouter.post("/actions/:id/approve", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const actionId = c.req.param("id")
  try {
    const [updated] = await db
      .update(agentAction)
      .set({
        status: "approved",
        approvedAt: new Date(),
      })
      .where(and(eq(agentAction.id, actionId), eq(agentAction.userId, user.id)))
      .returning()

    if (!updated) {
      return c.json({ error: "Pending action not found or unauthorized" }, 404)
    }

    logger.info({ actionId, userId: user.id }, "User approved agent action")
    return c.json({ success: true, action: updated })
  } catch (err: any) {
    logger.error({ err, actionId }, "Failed to approve agent action")
    return c.json({ error: "Internal Server Error" }, 500)
  }
})

/**
 * User rejects a pending staged action
 */
agentAuthRouter.post("/actions/:id/reject", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const actionId = c.req.param("id")
  try {
    const [updated] = await db
      .update(agentAction)
      .set({
        status: "rejected",
      })
      .where(and(eq(agentAction.id, actionId), eq(agentAction.userId, user.id)))
      .returning()

    if (!updated) {
      return c.json({ error: "Pending action not found or unauthorized" }, 404)
    }

    logger.info({ actionId, userId: user.id }, "User rejected agent action")
    return c.json({ success: true, action: updated })
  } catch (err: any) {
    logger.error({ err, actionId }, "Failed to reject agent action")
    return c.json({ error: "Internal Server Error" }, 500)
  }
})
