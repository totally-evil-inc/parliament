import { logger } from "@workspace/logger"
import nodemailer from "nodemailer"

export async function renderEmail(
  template: string,
  props: Record<string, any>
): Promise<string> {
  const commandUrl = Bun.env.COMMAND_SERVER_URL ?? "http://localhost:3000"
  const response = await fetch(`${commandUrl}/internal/email/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ template, props }),
  })
  if (!response.ok) {
    throw new Error(`Failed to render email: ${response.statusText}`)
  }
  const data = (await response.json()) as { html: string }
  return data.html
}

let transporter: any = null

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const apiKey = Bun.env.RESEND_API_KEY
  const smtpHost = Bun.env.SMTP_HOST
  const smtpPort = Bun.env.SMTP_PORT
  const smtpUser = Bun.env.SMTP_USER
  const smtpPass = Bun.env.SMTP_PASS || Bun.env.SMTP_PASSWORD
  const from = Bun.env.EMAIL_FROM || "Acme <onboarding@resend.dev>"

  // 1. If SMTP settings are provided, use SMTP (Gmail, etc.)
  if (smtpHost && smtpUser && smtpPass) {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort || 465),
        secure: Number(smtpPort || 465) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    }

    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
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
