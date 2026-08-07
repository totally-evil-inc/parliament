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

export const gmailRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: Record<string, unknown> | null
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
    const body = await c.req.json().catch(() => ({}))
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
    const body = await c.req.json()
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
    const activities = await db
      .select()
      .from(emailThreadActivity)
      .where(eq(emailThreadActivity.userId, user.id))
      .orderBy(desc(emailThreadActivity.createdAt))
      .limit(50)

    const watchStatus = await db
      .select()
      .from(gmailWatchSubscription)
      .where(eq(gmailWatchSubscription.userId, user.id))
      .limit(1)

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
