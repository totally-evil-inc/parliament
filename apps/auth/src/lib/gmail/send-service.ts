import { logger } from "@workspace/logger"
import { getValidGoogleAccessToken } from "./client"

export interface SendEmailOptions {
  userId: string
  to: string
  subject: string
  htmlText: string
  plainText?: string
  replyTo?: string
}

export interface CreateDraftOptions {
  userId: string
  to: string
  subject: string
  htmlText: string
  plainText?: string
}

export interface GmailMessageResponse {
  id: string
  threadId: string
  labelIds?: string[]
}

export interface GmailDraftResponse {
  id: string
  message: GmailMessageResponse
}

/**
 * Constructs an RFC 2822 message formatted as base64url string suitable for Gmail API.
 */
export function buildRfc2822RawMessage(options: {
  to: string
  subject: string
  htmlText: string
  plainText?: string
  replyTo?: string
}): string {
  const sanitizeHeader = (val: string) => val.replace(/[\r\n]/g, "")
  const boundary = `====_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`
  const lines: string[] = [
    `To: ${sanitizeHeader(options.to)}`,
    `Subject: ${sanitizeHeader(options.subject)}`,
    `MIME-Version: 1.0`,
  ]

  if (options.replyTo) {
    lines.push(`Reply-To: ${sanitizeHeader(options.replyTo)}`)
  }

  const plainContent = options.plainText || options.htmlText.replace(/<[^>]+>/g, "")
  const plainBase64 = Buffer.from(plainContent, "utf-8").toString("base64")
  const htmlBase64 = Buffer.from(options.htmlText, "utf-8").toString("base64")

  lines.push(
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    plainBase64,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    htmlBase64,
    ``,
    `--${boundary}--`
  )

  const rawString = lines.join("\r\n")

  // Convert to base64url string (RFC 4648)
  const base64 = Buffer.from(rawString, "utf-8").toString("base64")
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Sends an email using the Gmail REST API (gmail.send scope)
 */
export async function sendGmailMessage(
  options: SendEmailOptions
): Promise<GmailMessageResponse> {
  const accessToken = await getValidGoogleAccessToken(options.userId)
  const rawMessage = buildRfc2822RawMessage(options)

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: rawMessage,
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    logger.error(
      { status: res.status, errText, userId: options.userId, to: options.to },
      "Failed to send Gmail message"
    )

    let parsedMsg = res.statusText
    try {
      const errJson = JSON.parse(errText)
      if (errJson.error?.message) {
        parsedMsg = errJson.error.message
      }
    } catch (_) {}

    throw new Error(`Gmail API error: ${parsedMsg}`)
  }

  const data = (await res.json()) as GmailMessageResponse
  logger.info(
    { messageId: data.id, threadId: data.threadId, to: options.to },
    "Successfully sent Gmail message"
  )
  return data
}

/**
 * Creates a native draft in the user's Gmail mailbox
 */
export async function createGmailDraft(
  options: CreateDraftOptions
): Promise<GmailDraftResponse> {
  const accessToken = await getValidGoogleAccessToken(options.userId)
  const rawMessage = buildRfc2822RawMessage(options)

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          raw: rawMessage,
        },
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    logger.error(
      { status: res.status, errText, userId: options.userId },
      "Failed to create Gmail draft"
    )
    throw new Error(`Gmail API draft error: ${res.statusText}`)
  }

  const data = (await res.json()) as GmailDraftResponse
  logger.info(
    { draftId: data.id, userId: options.userId },
    "Successfully created Gmail draft"
  )
  return data
}
