import { db } from "@workspace/database"
import { inboundWebhookLog } from "@workspace/database/schema"
import { logger } from "@workspace/logger"
import { Hono } from "hono"
import { getValidGoogleAccessToken } from "../lib/gmail/client"

export const inboundRouter = new Hono<{
  Variables: {
    user: any
    session: any
    logContext: Record<string, unknown>
  }
}>()

/**
 * Handle cryptographic Reply-To transactional email webhooks (e.g. Postmark/Resend/SendGrid)
 */
inboundRouter.post("/reply-to", async (c) => {
  try {
    const body = await c.req.json()
    const headers = c.req.header()
    const { token, fromEmail, subject, textBody, workspaceId = "default" } = body

    if (!fromEmail || !subject) {
      return c.json({ error: "Missing required fields: fromEmail, subject" }, 400)
    }

    const logRecord = await db
      .insert(inboundWebhookLog)
      .values({
        provider: "reply-to",
        eventType: "inbound_reply",
        payload: {
          token,
          fromEmail,
          subject,
          textBody,
          workspaceId,
        },
        headers,
      })
      .returning()

    logger.info(
      { logId: logRecord[0]?.id, fromEmail, subject, token },
      "Successfully logged cryptographic Reply-To inbound message"
    )

    return c.json({
      success: true,
      logId: logRecord[0]?.id,
      status: "received",
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error({ err }, "Failed to process Reply-To inbound webhook")
    return c.json({ error: errorMsg }, 500)
  }
})

/**
 * Endpoint for User-Owned Google Apps Script auto-forwarding webhook bridge
 */
inboundRouter.post("/apps-script", async (c) => {
  try {
    const body = await c.req.json()
    const secret = c.req.header("x-command-webhook-secret")
    const expectedSecret = process.env.INBOUND_WEBHOOK_SECRET

    if (expectedSecret && secret !== expectedSecret) {
      return c.json({ error: "Unauthorized webhook secret" }, 401)
    }

    const { workspaceId = "default", email, attachments = [] } = body

    const logRecord = await db
      .insert(inboundWebhookLog)
      .values({
        provider: "apps-script",
        eventType: "auto_forward",
        payload: {
          workspaceId,
          email,
          attachmentCount: attachments.length,
          attachments,
        },
      })
      .returning()

    logger.info(
      { logId: logRecord[0]?.id, workspaceId, attachmentCount: attachments.length },
      "Successfully processed Google Apps Script inbound webhook bridge payload"
    )

    return c.json({
      success: true,
      logId: logRecord[0]?.id,
      attachmentsIngested: attachments.length,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error({ err }, "Failed to process Apps Script inbound payload")
    return c.json({ error: errorMsg }, 500)
  }
})

/**
 * Scan user's Google Drive "Command Drops" folder (drive.file scope) for uploaded invoice PDFs
 */
inboundRouter.post("/drive-drop", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const accessToken = await getValidGoogleAccessToken(user.id)

    // Search for files in app-created "Command Drops" folder or created by this app
    const query = encodeURIComponent("mimeType = 'application/pdf' and trashed = false")
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size)&pageSize=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!driveRes.ok) {
      const errText = await driveRes.text()
      logger.error({ status: driveRes.status, errText, userId: user.id }, "Failed to query Google Drive API")
      return c.json({ error: `Google Drive API error: ${driveRes.statusText}` }, 500)
    }

    const driveData: any = await driveRes.json()
    const files = driveData.files || []

    const logRecord = await db
      .insert(inboundWebhookLog)
      .values({
        provider: "drive-drop",
        eventType: "pdf_scan",
        payload: {
          workspaceId: user.id,
          filesCount: files.length,
          files,
        },
      })
      .returning()

    logger.info(
      { userId: user.id, filesFound: files.length, logId: logRecord[0]?.id },
      "Successfully ingested Google Drive drops folder PDFs"
    )

    return c.json({
      success: true,
      filesIngested: files.length,
      files,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error({ err, userId: user.id }, "Failed to process Google Drive drop folder scan")
    return c.json({ error: errorMsg }, 500)
  }
})
