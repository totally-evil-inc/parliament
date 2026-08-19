import { formatMarkdownToEmailHtml } from "@workspace/agent"
import { escapeHtml, sanitizeEmailUrl } from "../escape-html"

export interface DocumentDispatchEmailProps {
  documentType: "proposal" | "invoice"
  documentTitle: string
  personalMessage?: string
  shareUrl: string
  recipientEmail?: string
}

export function renderDocumentDispatchEmailHtml({
  documentType = "proposal",
  documentTitle = "Untitled Document",
  personalMessage = "",
  shareUrl = "#",
  recipientEmail,
}: DocumentDispatchEmailProps): string {
  const isProposal = documentType === "proposal"
  const typeLabel = isProposal ? "Proposal" : "Invoice"
  const actionLabel = isProposal ? "View Proposal" : "View Invoice"
  const safeTitle = escapeHtml(documentTitle || "Untitled Document")
  const safeShareUrl = sanitizeEmailUrl(shareUrl)
  const safeRecipientEmail = recipientEmail ? escapeHtml(recipientEmail) : ""
  const formattedMessageHtml = personalMessage
    ? formatMarkdownToEmailHtml(personalMessage)
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${typeLabel}: ${safeTitle}</title>
</head>
<body style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 12px; margin: 0; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); max-width: 500px; margin: 0 auto; padding: 36px 32px;">
    <!-- Header Row -->
    <div style="margin-bottom: 24px; line-height: 1;">
      <span style="display: inline-block; height: 7px; width: 7px; border-radius: 50%; background-color: #0f172a; margin-right: 8px; vertical-align: middle;"></span>
      <span style="font-family: monospace; font-size: 11px; font-weight: 600; color: #0f172a; letter-spacing: 0.18em; vertical-align: middle;">PARLIAMENT</span>
      <span style="float: right; display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: #f1f5f9; color: #475569; font-size: 10px; font-weight: 600; letter-spacing: 0.04em;">${documentType.toUpperCase()}</span>
    </div>

    <!-- Heading -->
    <h1 style="color: #0f172a; font-size: 20px; font-weight: 600; line-height: 1.3; letter-spacing: -0.01em; margin: 0 0 6px 0;">${safeTitle}</h1>
    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">A ${typeLabel.toLowerCase()} has been sent to you for review.</p>

    <!-- Personal Message Note -->
    ${
      formattedMessageHtml
        ? `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
            <div style="color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Message</div>
            <div style="font-size: 13px; line-height: 1.6; color: #334155;">${formattedMessageHtml}</div>
          </div>`
        : ""
    }

    <!-- Action Button -->
    <div style="text-align: center; margin: 24px 0 20px 0;">
      <a href="${safeShareUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 8px; padding: 11px 24px;">${actionLabel}</a>
    </div>

    <!-- Direct URL Fallback -->
    <div style="text-align: center; margin-bottom: 20px;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0 0 2px 0;">Direct link:</p>
      <a href="${safeShareUrl}" style="color: #475569; font-size: 11px; word-break: break-all; text-decoration: underline;">${safeShareUrl}</a>
    </div>

    <!-- Divider -->
    <div style="border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;"></div>

    <!-- Footer -->
    <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin: 0;">
      Parliament Workspace${safeRecipientEmail ? ` • Sent to ${safeRecipientEmail}` : ""}
    </p>
  </div>
</body>
</html>`
}
