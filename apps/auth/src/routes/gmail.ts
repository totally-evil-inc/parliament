import { db, desc, eq } from "@workspace/database"
import {
  emailThreadActivity,
  gmailWatchSubscription,
} from "@workspace/database/schema"
import { logger } from "@workspace/logger"
import { Hono } from "hono"
import { createGmailDraft, sendGmailMessage } from "../lib/gmail/send-service"
import {
  processPubSubNotification,
  registerGmailWatch,
} from "../lib/gmail/watch-service"
import { bearerSecretMatch, secretsEqual } from "../lib/utils"

export const gmailRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: { id: string } | null
    logContext: Record<string, unknown>
  }
}>()

/**
 * Send an email directly via the authenticated user's Gmail account (gmail.send scope)
 */
gmailRouter.post("/send", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const body = await c.req.json()
    const { to, subject, htmlText, plainText, replyTo } = body

    if (!to || !subject || !htmlText) {
      return c.json(
        { error: "Missing required fields: to, subject, htmlText" },
        400
      )
    }

    const result = await sendGmailMessage({
      userId: user.id,
      to,
      subject,
      htmlText,
      plainText,
      replyTo,
    })

    return c.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error(
      { err, userId: user.id },
      "Failed to process Gmail send request"
    )
    return c.json({ error: errorMsg }, 500)
  }
})

/**
 * Prepare a native draft email in the authenticated user's Gmail account
 */
gmailRouter.post("/draft", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const body = await c.req.json()
    const { to, subject, htmlText, plainText } = body

    if (!to || !subject || !htmlText) {
      return c.json(
        { error: "Missing required fields: to, subject, htmlText" },
        400
      )
    }

    const result = await createGmailDraft({
      userId: user.id,
      to,
      subject,
      htmlText,
      plainText,
    })

    return c.json({
      success: true,
      draftId: result.id,
      messageId: result.message?.id,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error(
      { err, userId: user.id },
      "Failed to process Gmail draft request"
    )
    return c.json({ error: errorMsg }, 500)
  }
})

/**
 * Register Google Cloud Pub/Sub real-time watch subscription for gmail.metadata
 */
gmailRouter.post("/watch/register", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return c.json({ error: "Bad Request: Invalid JSON payload" }, 400)
    }
    if (
      body.topicName !== undefined &&
      (typeof body.topicName !== "string" || body.topicName.trim() === "")
    ) {
      return c.json(
        { error: "Bad Request: topicName must be a non-empty string" },
        400
      )
    }

    const result = await registerGmailWatch({
      userId: user.id,
      userEmail: user.email,
      topicName: body.topicName,
    })

    return c.json({
      success: true,
      historyId: result.historyId,
      expiration: result.expiration,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error(
      { err, userId: user.id },
      "Failed to register Gmail Pub/Sub watch"
    )
    return c.json({ error: errorMsg }, 500)
  }
})

/**
 * Webhook endpoint to receive Google Cloud Pub/Sub push notifications
 */
gmailRouter.post("/pubsub/webhook", async (c) => {
  try {
    const authHeader = c.req.header("Authorization")
    const tokenQuery = c.req.query("token")
    const secretToken = process.env.PUBSUB_VERIFICATION_TOKEN
    const isProduction = process.env.NODE_ENV === "production"
    if (secretToken) {
      const tokenValid =
        (tokenQuery !== undefined && secretsEqual(tokenQuery, secretToken)) ||
        (authHeader !== undefined && bearerSecretMatch(authHeader, secretToken))
      if (!tokenValid) {
        return c.json(
          { error: "Unauthorized: Invalid or missing webhook token" },
          401
        )
      }
    } else if (isProduction) {
      return c.json(
        { error: "Unauthorized: Missing webhook verification token" },
        401
      )
    } else {
      logger.warn(
        { path: c.req.path },
        "Allowing unauthenticated Pub/Sub webhook request in non-production mode"
      )
    }

    const body = await c.req.json().catch(() => null)
    if (
      !body ||
      typeof body !== "object" ||
      typeof body.message?.data !== "string" ||
      body.message.data === ""
    ) {
      return c.json({ error: "Bad Request: Missing Pub/Sub message.data" }, 400)
    }

    const result = await processPubSubNotification(body)
    return c.json({ success: result.processed, details: result })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error({ err }, "Error handling Pub/Sub webhook")
    return c.json({ error: errorMsg }, 500)
  }
})

/**
 * List thread activity logs, response times, and client silence indicators
 */
gmailRouter.get("/thread-activity", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const [activities, watchStatus] = await Promise.all([
      db
        .select()
        .from(emailThreadActivity)
        .where(eq(emailThreadActivity.userId, user.id))
        .orderBy(desc(emailThreadActivity.createdAt))
        .limit(50),
      db
        .select()
        .from(gmailWatchSubscription)
        .where(eq(gmailWatchSubscription.userId, user.id))
        .limit(1),
    ])

    return c.json({
      activities,
      subscription: watchStatus[0] || null,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error({ err, userId: user.id }, "Failed to fetch thread activity")
    return c.json({ error: errorMsg }, 500)
  }
})
