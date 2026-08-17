import { and, db, eq, schema } from "@workspace/database"
import { logWideEvent } from "@workspace/logger"
import { Hono } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { z } from "zod"
import { AgentContextError, httpStatusFor } from "../../agent/org-context"
import { type AgentContext, buildToolContext } from "../../agent/tool-ctx"
import { ToolDispatcher } from "../../agent/tool-dispatcher"

export const agentActionsRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: { activeOrganizationId?: string | null } | null
  }
}>()

const resolveActionSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().trim().max(1000).optional(),
})

/**
 * GET /api/agent/actions/pending — list pending approvals for active organization.
 */
agentActionsRouter.get("/actions/pending", async (c) => {
  let ctx: AgentContext
  try {
    ctx = await buildToolContext(c)
  } catch (err) {
    if (err instanceof AgentContextError) {
      return c.json(
        { error: { code: err.code, message: err.message } },
        httpStatusFor(err.code) as ContentfulStatusCode
      )
    }
    return c.json(
      { error: { code: "unauthorized", message: "Unauthorized" } },
      401
    )
  }

  const rows = await db
    .select()
    .from(schema.chatActionApproval)
    .where(
      and(
        eq(schema.chatActionApproval.organizationId, ctx.organizationId),
        eq(schema.chatActionApproval.status, "pending")
      )
    )

  return c.json({ actions: rows })
})

/**
 * POST /api/agent/actions/:id/resolve — resolve a durable pending action (approve / reject).
 * Executes the underlying tool under atomic row-lock upon approval.
 */
agentActionsRouter.post("/actions/:id/resolve", async (c) => {
  const { id } = c.req.param()
  let ctx: AgentContext
  try {
    ctx = await buildToolContext(c)
  } catch (err) {
    if (err instanceof AgentContextError) {
      return c.json(
        { error: { code: err.code, message: err.message } },
        httpStatusFor(err.code) as ContentfulStatusCode
      )
    }
    return c.json(
      { error: { code: "unauthorized", message: "Unauthorized" } },
      401
    )
  }

  const body = await c.req.json().catch(() => null)
  const parsed = resolveActionSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "invalid_body",
          message: "Invalid approval resolution payload",
        },
      },
      422
    )
  }

  const { approved, feedback } = parsed.data
  const startTime = Date.now()

  try {
    // 1. Atomically resolve and lock the action record
    const [action] = await db
      .select()
      .from(schema.chatActionApproval)
      .where(
        and(
          eq(schema.chatActionApproval.id, id),
          eq(schema.chatActionApproval.organizationId, ctx.organizationId)
        )
      )
      .limit(1)

    if (!action) {
      return c.json(
        { error: { code: "not_found", message: "Action approval not found" } },
        404
      )
    }

    if (action.status !== "pending") {
      return c.json(
        {
          error: {
            code: "already_resolved",
            message: `This action has already been ${action.status}.`,
          },
        },
        409
      )
    }

    if (new Date() > new Date(action.expiresAt)) {
      await db
        .update(schema.chatActionApproval)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(schema.chatActionApproval.id, id))

      return c.json(
        {
          error: {
            code: "action_expired",
            message: "This action approval request has expired.",
          },
        },
        410
      )
    }

    const nextStatus = approved ? "approved" : "rejected"

    await db
      .update(schema.chatActionApproval)
      .set({
        status: nextStatus,
        resolvedByUserId: ctx.userId,
        resolutionFeedback: feedback || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.chatActionApproval.id, id))

    let executionResult: unknown = null
    let isError = false

    // 2. If approved, execute the tool directly through the dispatcher
    if (approved) {
      const dispatcher = new ToolDispatcher(ctx)
      // Execute without approval gate check
      const exec = await dispatcher.executeTool(
        action.toolName,
        action.toolArgs
      )
      executionResult = exec.result
      isError = exec.isError
    } else {
      executionResult = {
        status: "rejected",
        message: feedback
          ? `Action rejected by user: ${feedback}`
          : "Action was rejected by user.",
      }
    }

    logWideEvent({
      event: "agent.action.resolved",
      outcome: isError ? "failure" : "success",
      durationMs: Date.now() - startTime,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      metadata: {
        approvalId: id,
        toolName: action.toolName,
        approved,
        feedback,
      },
    })

    return c.json({
      id,
      status: nextStatus,
      toolName: action.toolName,
      result: executionResult,
      isError,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logWideEvent({
      event: "agent.action.resolve_failed",
      outcome: "failure",
      durationMs: Date.now() - startTime,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      metadata: {
        approvalId: id,
        error: errorMsg,
      },
    })
    return c.json(
      { error: { code: "resolution_failed", message: errorMsg } },
      500
    )
  }
})
