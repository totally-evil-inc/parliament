import { isUuid } from "@workspace/agent"
import { and, db, desc, eq, schema } from "@workspace/database"
import { logWideEvent } from "@workspace/logger"
import { Hono } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { z } from "zod"
import { AgentContextError, httpStatusFor } from "../../agent/org-context"
import { persistApprovalResolution } from "../../agent/persist"
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
  let targetApprovalId = id

  try {
    if (!isUuid(id)) {
      return c.json(
        {
          error: {
            code: "not_found",
            message: `Action approval "${id}" was not found`,
          },
        },
        404
      )
    }

    targetApprovalId = id.trim()

    // 1. Atomically lock and transition status from pending to approved/rejected
    const nextStatus = approved ? "approved" : "rejected"

    const [updatedRow] = await db
      .update(schema.chatActionApproval)
      .set({
        status: nextStatus,
        resolvedByUserId: ctx.userId,
        resolutionFeedback: feedback || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.chatActionApproval.id, targetApprovalId),
          eq(schema.chatActionApproval.organizationId, ctx.organizationId),
          eq(schema.chatActionApproval.status, "pending")
        )
      )
      .returning()

    if (!updatedRow) {
      // Check if it exists in another state or was not found
      const [existing] = await db
        .select()
        .from(schema.chatActionApproval)
        .where(
          and(
            eq(schema.chatActionApproval.id, targetApprovalId),
            eq(schema.chatActionApproval.organizationId, ctx.organizationId)
          )
        )
        .limit(1)

      if (!existing) {
        return c.json(
          {
            error: { code: "not_found", message: "Action approval not found" },
          },
          404
        )
      }

      return c.json(
        {
          error: {
            code: "already_resolved",
            message: `This action has already been ${existing.status}.`,
          },
        },
        409
      )
    }

    if (new Date() > new Date(updatedRow.expiresAt)) {
      await db
        .update(schema.chatActionApproval)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(schema.chatActionApproval.id, targetApprovalId))

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

    let executionResult: unknown = null
    let isError = false

    // 2. If approved, execute the tool directly through the dispatcher
    if (approved) {
      const dispatcher = new ToolDispatcher(ctx)
      // Execute with approval gate check bypassed
      const exec = await dispatcher.executeTool(
        updatedRow.toolName,
        updatedRow.toolArgs,
        { skipApprovalGate: true }
      )
      executionResult = exec.result
      isError = exec.isError

      if (exec.isError) {
        // Revert to pending so the user can retry the action instead of
        // being locked out with a stale "approved" row.
        await db
          .update(schema.chatActionApproval)
          .set({
            status: "pending",
            resolvedByUserId: null,
            resolutionFeedback: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.chatActionApproval.id, targetApprovalId))

        logWideEvent({
          event: "agent.action.resolve_failed",
          outcome: "failure",
          durationMs: Date.now() - startTime,
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          metadata: {
            approvalId: targetApprovalId,
            toolName: updatedRow.toolName,
            revertedToPending: true,
            error: String(exec.result),
          },
        })

        return c.json(
          {
            error: {
              code: "execution_failed",
              message: String(exec.result),
            },
          },
          502
        )
      }
    } else {
      executionResult = {
        status: "rejected",
        message: feedback
          ? `Action rejected by user: ${feedback}`
          : "Action was rejected by user.",
      }
    }

    // Persist the resolution outcome back into the assistant message parts so
    // reloads show the real result and later turns feed it to the model.
    await persistApprovalResolution({
      approvalId: targetApprovalId,
      conversationId: updatedRow.conversationId,
      organizationId: ctx.organizationId,
      toolName: updatedRow.toolName,
      result: executionResult,
      isError,
    }).catch((err) => {
      logWideEvent({
        event: "agent.action.resolution_persist_failed",
        outcome: "failure",
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        metadata: { approvalId: targetApprovalId, error: String(err) },
      })
    })

    logWideEvent({
      event: "agent.action.resolved",
      outcome: isError ? "failure" : "success",
      durationMs: Date.now() - startTime,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      metadata: {
        approvalId: targetApprovalId,
        toolName: updatedRow.toolName,
        approved,
        feedback,
      },
    })

    return c.json({
      id: targetApprovalId,
      status: nextStatus,
      toolName: updatedRow.toolName,
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
        approvalId: targetApprovalId,
        error: errorMsg,
      },
    })
    return c.json(
      { error: { code: "resolution_failed", message: errorMsg } },
      500
    )
  }
})
