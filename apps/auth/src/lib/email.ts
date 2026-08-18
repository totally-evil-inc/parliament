import { logger } from "@workspace/logger"
import nodemailer from "nodemailer"
import { escapeHtml, sanitizeEmailUrl } from "./email/escape-html"
import { formatMarkdownToEmailHtml } from "./email/format-markdown"
import {
  type DocumentDispatchEmailProps,
  renderDocumentDispatchEmailHtml,
} from "./email/templates/document-dispatch"
import {
  type InvitationEmailProps,
  renderInvitationEmailHtml,
} from "./email/templates/invitation"
import {
  type MagicLinkEmailProps,
  renderMagicLinkEmailHtml,
} from "./email/templates/magic-link"

export { formatMarkdownToEmailHtml }

export async function renderEmail(
  template: string,
  props: Record<string, any>
): Promise<string> {
  try {
    if (template === "document-dispatch" || template === "document") {
      return renderDocumentDispatchEmailHtml(
        props as DocumentDispatchEmailProps
      )
    }
    if (template === "invitation") {
      return renderInvitationEmailHtml(props as InvitationEmailProps)
    }
    if (template === "magic-link") {
      return renderMagicLinkEmailHtml(props as MagicLinkEmailProps)
    }
  } catch (err) {
    logger.warn(
      { err, template },
      "In-process email template render failed, falling back to minimal HTML"
    )
  }

  const safeMessage = escapeHtml(props?.message || "")
  const safeUrl = sanitizeEmailUrl(props?.url || "")
  if (safeMessage && safeUrl && safeUrl !== "#") {
    return `<p>${safeMessage}</p><p><a href="${safeUrl}">${safeUrl}</a></p>`
  }
  if (safeUrl && safeUrl !== "#") {
    return `<p><a href="${safeUrl}">${safeUrl}</a></p>`
  }
  return `<p>${safeMessage}</p>`
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

let transporter: nodemailer.Transporter | null = null
let transporterConfig: string | null = null

function getTransporter({
  host,
  port,
  user,
  pass,
  secure,
}: {
  host: string
  port: number
  user: string
  pass: string
  secure: boolean
}): nodemailer.Transporter {
  const configKey = JSON.stringify({ host, port, user, pass, secure })
  if (!transporter || transporterConfig !== configKey) {
    // Rebuild the transporter whenever its configuration changes so dynamic
    // (e.g. hot-reloaded) SMTP settings never route mail through a stale pool.
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure && port !== 25,
      auth: {
        user,
        pass,
      },
    })
    transporterConfig = configKey
  }
  return transporter
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}) {
  if (!to || !EMAIL_REGEX.test(to)) {
    throw new Error(`Invalid email recipient address: ${to}`)
  }

  const apiKey = Bun.env.RESEND_API_KEY
  const smtpHost = Bun.env.SMTP_HOST
  const smtpPort = Bun.env.SMTP_PORT
  const smtpUser = Bun.env.SMTP_USER
  const smtpPass = Bun.env.SMTP_PASS || Bun.env.SMTP_PASSWORD
  const from = Bun.env.EMAIL_FROM || "Acme <onboarding@resend.dev>"

  // 1. If SMTP settings are provided, use SMTP (Gmail, etc.)
  if (smtpHost && smtpUser && smtpPass) {
    const rawPort = Number.parseInt(smtpPort || "465", 10)
    const port = Number.isNaN(rawPort) ? 465 : rawPort
    const smtp = getTransporter({
      host: smtpHost,
      port,
      user: smtpUser,
      pass: smtpPass,
      secure: port === 465,
    })

    try {
      await smtp.sendMail({
        from,
        to,
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      })
      return
    } catch (err: any) {
      throw new Error(`SMTP email delivery failed: ${err.message}`)
    }
  }

  // 2. Otherwise, fall back to Resend API if API Key is present
  if (apiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content)
            ? a.content.toString("base64")
            : a.content,
        })),
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(
        `Resend email delivery failed: ${response.status} - ${errText}`
      )
    }
    return
  }

  // 3. Fallback for local development warning
  const linkMatch = html.match(/href="([^"]+)"/)
  const link = linkMatch ? linkMatch[1] : "No link found"
  logger.warn(
    { to, subject, link },
    "Neither Resend nor SMTP credentials set. Local dev fallback triggered."
  )
}
