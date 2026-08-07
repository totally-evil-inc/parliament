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

const MAX_ARGS_DEPTH = 6
const UNSAFE_ARG_KEYS = new Set(["__proto__", "constructor", "prototype"])

/**
 * Recursively validate that `args` is a JSON-safe plain object and strip keys
 * that could enable prototype pollution when persisted or re-hydrated.
 */
function sanitizeArgs(value: unknown, depth = 0): unknown {
  if (depth > MAX_ARGS_DEPTH) {
    throw new Error("args exceeds maximum nesting depth")
  }
  if (value === null || typeof value !== "object") {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeArgs(item, depth + 1))
  }
  const sanitized: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (UNSAFE_ARG_KEYS.has(key)) continue
    sanitized[key] = sanitizeArgs(item, depth + 1)
  }
  return sanitized
}

/**
 * Stage an action proposed by an agent (called by Go Harness daemon)
 */
agentAuthRouter.post("/stage", async (c) => {
  const user = c.get("user")
  const authSecret =
    c.req.header("X-Harness-Secret") || c.req.header("Authorization")
  const expectedSecret =
    process.env.HARNESS_AUTH_SECRET || process.env.BETTER_AUTH_SECRET
  const isProduction = process.env.NODE_ENV === "production"

  if (user) {
    // authenticated session: allowed
  } else if (!expectedSecret) {
    if (isProduction) {
      return c.json(
        {
          error:
            "Unauthorized: Harness authentication secret is not configured",
        },
        401
      )
    }
    logger.warn(
      { path: c.req.path },
      "Allowing unauthenticated stage request in non-production mode"
    )
  } else if (
    authSecret !== expectedSecret &&
    authSecret !== `Bearer ${expectedSecret}`
  ) {
    return c.json(
      { error: "Unauthorized: Invalid or missing harness authentication" },
      401
    )
  }

  const body = await c.req.json().catch(() => ({}))
  const { toolName, args, reason, confidenceScore, agentId, userId } = body

  if (
    !toolName ||
    typeof toolName !== "string" ||
    !args ||
    typeof args !== "object"
  ) {
    return c.json(
      { error: "Bad Request: Missing or invalid toolName or args" },
      400
    )
  }

  let safeArgs: unknown
  try {
    safeArgs = sanitizeArgs(args)
  } catch {
    return c.json(
      { error: "Bad Request: args must be a JSON-safe object" },
      400
    )
  }

  const targetUserId = userId || user?.id
  if (!targetUserId || typeof targetUserId !== "string") {
    return c.json(
      { error: "Bad Request: Target userId is required for approval staging" },
      400
    )
  }

  try {
    let policySetting = "require_approval"
    let targetAgentId = agentId

    if (targetAgentId) {
      const records = await db
        .select()
        .from(agent)
        .where(eq(agent.id, targetAgentId))
        .limit(1)

      if (records.length > 0) {
        const ag = records[0]
        if (ag.policy && ag.policy[toolName]) {
          policySetting = ag.policy[toolName]
        }
      }
    } else {
      // Find existing agent for user or require explicit agentId
      const existing = await db
        .select()
        .from(agent)
        .where(eq(agent.userId, targetUserId))
        .limit(1)

      if (existing.length > 0) {
        targetAgentId = existing[0].id
      } else {
        return c.json(
          { error: "Bad Request: Missing agentId for staging action" },
          400
        )
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

    const [staged] = await db
      .insert(agentAction)
      .values({
        agentId: targetAgentId,
        userId: targetUserId,
        toolName,
        args: safeArgs,
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
  } catch {
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
