import { logger } from "@workspace/logger"
import { Hono } from "hono"
import { createGmailDraft, sendGmailMessage } from "../lib/gmail/send-service"

export const gmailRouter = new Hono<{
  Variables: {
    user: any
    session: any
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
      return c.json({ error: "Missing required fields: to, subject, htmlText" }, 400)
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
    logger.error({ err, userId: user.id }, "Failed to process Gmail send request")
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
      return c.json({ error: "Missing required fields: to, subject, htmlText" }, 400)
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
    logger.error({ err, userId: user.id }, "Failed to process Gmail draft request")
    return c.json({ error: errorMsg }, 500)
  }
})
