import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { IconArrowBoldRight, IconCircleCheck, IconGear } from "nucleo-glass"
import * as React from "react"
import { useSendGmailEmail } from "../hooks/use-gmail-operations"
import { generateGoogleWebComposeUrl } from "../utils/mailto-generator"

export interface SendDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentType: "proposal" | "invoice"
  documentTitle: string
  defaultRecipientEmail?: string
  shareUrl?: string
  onFinalizeAndGetShareUrl?: () => Promise<string>
}

export function SendDocumentDialog({
  open,
  onOpenChange,
  documentType,
  documentTitle,
  defaultRecipientEmail = "",
  shareUrl: initialShareUrl,
  onFinalizeAndGetShareUrl,
}: SendDocumentDialogProps) {
  const [recipientEmail, setRecipientEmail] = React.useState(
    defaultRecipientEmail
  )
  const [subject, setSubject] = React.useState(
    `${documentType === "proposal" ? "Proposal" : "Invoice"}: ${documentTitle}`
  )
  const [personalMessage, setPersonalMessage] = React.useState(
    `Hi,\n\nPlease review the attached ${documentType} "${documentTitle}". You can view and sign it here:`
  )
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [activeShareUrl, setActiveShareUrl] = React.useState<string | null>(
    initialShareUrl || null
  )

  const sendGmailMutation = useSendGmailEmail()

  React.useEffect(() => {
    if (open) {
      if (defaultRecipientEmail) setRecipientEmail(defaultRecipientEmail)
      if (initialShareUrl) setActiveShareUrl(initialShareUrl)
    }
  }, [open, defaultRecipientEmail, initialShareUrl])

  const ensureShareUrl = async (): Promise<string> => {
    if (activeShareUrl) return activeShareUrl
    if (onFinalizeAndGetShareUrl) {
      const url = await onFinalizeAndGetShareUrl()
      setActiveShareUrl(url)
      return url
    }
    return window.location.href
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleSendViaGmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = recipientEmail.trim()
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setStatusMessage("Please enter a valid recipient email address.")
      return
    }

    try {
      setStatusMessage("Finalizing document link...")
      const url = await ensureShareUrl()

      const safeMessageHtml = escapeHtml(personalMessage).replace(
        /\n/g,
        "<br/>"
      )
      const safeUrl = escapeHtml(url)
      const htmlBody = [
        '<div style="font-family: sans-serif; line-height: 1.6; color: #333;">',
        `  <p>${safeMessageHtml}</p>`,
        `  <p><a href="${safeUrl}" style="display: inline-block; padding: 10px 18px; background-color: #0066ff; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">View ${documentType === "proposal" ? "Proposal" : "Invoice"}</a></p>`,
        `  <p style="font-size: 12px; color: #666;">Or copy link: ${safeUrl}</p>`,
        "</div>",
      ].join("\n")

      setStatusMessage("Sending email via Gmail API...")
      await sendGmailMutation.mutateAsync({
        to: trimmedEmail,
        subject,
        htmlText: htmlBody,
      })

      setStatusMessage(`Successfully sent via Gmail to ${trimmedEmail}!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send email"
      setStatusMessage(`Error: ${msg}`)
    }
  }

  const handleOpenInGmailWeb = async () => {
    const trimmedEmail = recipientEmail.trim()
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setStatusMessage("Please enter a valid recipient email address.")
      return
    }

    try {
      const url = await ensureShareUrl()
      const bodyText = `${personalMessage}\n\n${url}`
      const composeUrl = generateGoogleWebComposeUrl({
        to: trimmedEmail,
        subject,
        body: bodyText,
      })

      window.open(composeUrl, "_blank", "noopener,noreferrer")
      setStatusMessage("Opened pre-filled compose window in Gmail Web.")
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to generate compose URL"
      setStatusMessage(`Error: ${msg}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Send {documentType === "proposal" ? "Proposal" : "Invoice"} via
            Gmail
          </DialogTitle>
          <DialogDescription>
            Confirm or change the recipient email address and customize your
            message before sending.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSendViaGmail}
          className="flex flex-col gap-3 py-2"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="recipient-email"
              className="font-medium text-xs text-foreground"
            >
              Recipient Email Address
            </label>
            <input
              id="recipient-email"
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@company.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="email-subject"
              className="font-medium text-xs text-foreground"
            >
              Subject Line
            </label>
            <input
              id="email-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="personal-message"
              className="font-medium text-xs text-foreground"
            >
              Message Note
            </label>
            <textarea
              id="personal-message"
              rows={3}
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {statusMessage && (
            <div
              className={`rounded-md p-2.5 text-xs ${
                statusMessage.startsWith("Error")
                  ? "bg-destructive/10 text-destructive"
                  : statusMessage.startsWith("Successfully")
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {statusMessage.startsWith("Successfully") && (
                <IconCircleCheck className="size-3.5 mr-1 inline shrink-0" />
              )}
              {statusMessage}
            </div>
          )}

          <DialogFooter className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleOpenInGmailWeb}
            >
              <IconGear className="size-3 mr-1" />
              Open in Gmail Web
            </Button>

            <Button
              type="submit"
              size="sm"
              className="text-xs"
              disabled={sendGmailMutation.isPending}
            >
              <IconArrowBoldRight className="size-3 mr-1" />
              {sendGmailMutation.isPending
                ? "Sending..."
                : "Send via Gmail API"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

