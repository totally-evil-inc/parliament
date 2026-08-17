import { logger } from "@workspace/logger"
import { getValidGoogleAccessToken } from "./client"

export interface SendEmailAttachment {
  filename: string
  mimeType: "application/pdf"
  content: string // Base64 string
}

export interface SendEmailOptions {
  userId: string
  to: string
  subject: string
  htmlText: string
  plainText?: string
  replyTo?: string
  attachment?: SendEmailAttachment
}

export interface CreateDraftOptions {
  userId: string
  to: string
  subject: string
  htmlText: string
  plainText?: string
  attachment?: SendEmailAttachment
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

const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024 // 15MB decoded limit

/**
 * Validates the PDF attachment content signature, mime-type, and filename.
 */
export function validatePdfAttachment(attachment: SendEmailAttachment): {
  filename: string
  wrappedContent: string
} {
  if (attachment.mimeType !== "application/pdf") {
    throw new Error(
      `Invalid attachment MIME type: expected application/pdf, received ${attachment.mimeType}`
    )
  }

  const rawFilename = attachment.filename || "document.pdf"
  let cleanFilename = rawFilename
    .replace(/[^\w.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .trim()

  if (!cleanFilename.toLowerCase().endsWith(".pdf")) {
    cleanFilename = `${cleanFilename}.pdf`
  }
  if (cleanFilename.length > 120) {
    cleanFilename = cleanFilename.slice(-120)
    if (!cleanFilename.toLowerCase().endsWith(".pdf")) {
      cleanFilename = `${cleanFilename}.pdf`
    }
  }

  const cleanBase64 = attachment.content.replace(/\s+/g, "")
  if (!cleanBase64) {
    throw new Error("Attachment content is empty")
  }

  const decoded = Buffer.from(cleanBase64, "base64")
  if (decoded.length > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(
      `Attachment size (${(decoded.length / 1024 / 1024).toFixed(1)}MB) exceeds the maximum limit of 15MB`
    )
  }

  if (
    decoded.length < 5 ||
    decoded.subarray(0, 5).toString("utf-8") !== "%PDF-"
  ) {
    throw new Error(
      "Invalid PDF attachment content: binary payload missing %PDF- header signature"
    )
  }

  // RFC 2045 / RFC 2822: Base64 data lines should be wrapped at 76 characters
  const wrappedContent =
    cleanBase64.match(/.{1,76}/g)?.join("\r\n") ?? cleanBase64

  return {
    filename: cleanFilename,
    wrappedContent,
  }
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
  attachment?: SendEmailAttachment
}): string {
  const sanitizeHeader = (val: string) => val.replace(/\p{Cc}/gu, " ").trim()
  const lines: string[] = [
    `To: ${sanitizeHeader(options.to)}`,
    `Subject: ${sanitizeHeader(options.subject)}`,
    `MIME-Version: 1.0`,
  ]

  if (options.replyTo) {
    lines.push(`Reply-To: ${sanitizeHeader(options.replyTo)}`)
  }

  const plainContent =
    options.plainText || options.htmlText.replace(/<[^>]+>/g, "")
  const plainBase64 =
    Buffer.from(plainContent, "utf-8")
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") || ""
  const htmlBase64 =
    Buffer.from(options.htmlText, "utf-8")
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") || ""

  if (options.attachment) {
    const { filename, wrappedContent } = validatePdfAttachment(
      options.attachment
    )
    const mixedBoundary = `----=_Mixed_${crypto.randomUUID().replace(/-/g, "")}`
    const altBoundary = `----=_Alt_${crypto.randomUUID().replace(/-/g, "")}`

    lines.push(
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      ``,
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      plainBase64,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      htmlBase64,
      ``,
      `--${altBoundary}--`,
      ``,
      `--${mixedBoundary}`,
      `Content-Type: application/pdf; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      wrappedContent,
      ``,
      `--${mixedBoundary}--`
    )
  } else {
    const boundary = `----=_Part_${crypto.randomUUID().replace(/-/g, "")}`
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
  }

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

  let res: Response
  try {
    res = await fetch(
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
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown network error"
    logger.error(
      { err, userId: options.userId, to: options.to },
      "Network failure while sending Gmail message"
    )
    throw new Error(`Failed to reach Gmail API: ${errorMsg}`)
  }

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

  let res: Response
  try {
    res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
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
    })
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown network error"
    logger.error(
      { err, userId: options.userId },
      "Network failure while creating Gmail draft"
    )
    throw new Error(`Failed to reach Gmail API: ${errorMsg}`)
  }

  if (!res.ok) {
    const errText = await res.text()
    logger.error(
      { status: res.status, errText, userId: options.userId },
      "Failed to create Gmail draft"
    )

    let parsedMsg = res.statusText
    try {
      const errJson = JSON.parse(errText)
      if (errJson.error?.message) {
        parsedMsg = errJson.error.message
      }
    } catch (_) {}

    throw new Error(`Gmail API draft error: ${parsedMsg || errText}`)
  }

  const data = (await res.json()) as GmailDraftResponse
  logger.info(
    { draftId: data.id, userId: options.userId },
    "Successfully created Gmail draft"
  )
  return data
}
