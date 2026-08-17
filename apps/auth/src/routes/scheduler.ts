import { logger } from "@workspace/logger"
import { Hono } from "hono"
import { processDueScheduledDispatches } from "../lib/scheduler/dispatch-worker"
import { bearerSecretMatch } from "../lib/utils"

export const schedulerRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: { id: string } | null
    logContext: Record<string, unknown>
  }
}>()

/**
 * Trigger background processing of due scheduled dispatches (or a specific dispatch immediately)
 */
schedulerRouter.post("/tick", async (c) => {
  const user = c.get("user")
  const authHeader = c.req.header("Authorization")
  const expectedSecret =
    process.env.INTERNAL_API_SECRET ||
    process.env.HARNESS_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET

  const isAuthorized =
    Boolean(user) ||
    Boolean(expectedSecret && bearerSecretMatch(authHeader, expectedSecret))

  if (!isAuthorized && process.env.NODE_ENV === "production") {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const body = await c.req.json().catch(() => ({}))
    const dispatchId =
      typeof body.dispatchId === "string" ? body.dispatchId : undefined
    const forceNow = Boolean(body.forceNow)

    const result = await processDueScheduledDispatches({
      dispatchId,
      forceNow,
    })

    return c.json({
      success: true,
      ...result,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error({ err }, "Failed to process scheduler tick")
    return c.json({ error: errorMsg }, 500)
  }
})
