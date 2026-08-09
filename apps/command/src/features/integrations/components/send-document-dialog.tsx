import { Share01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { IconCircleCheck, IconGear } from "nucleo-glass"
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
  onFinalizeAndGetShareUrl?: (recipientEmail?: string) => Promise<string>
}

type MediumType = "gmail" | "outlook" | "whatsapp"

interface MediumOption {
  id: MediumType
  name: string
  description: string
  status: "available" | "coming_soon"
  badge?: string
}

const MEDIUM_OPTIONS: MediumOption[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Direct API dispatch & Web mail",
    status: "available",
    badge: "Connected",
  },
  {
    id: "outlook",
    name: "Outlook 365",
    description: "Microsoft Graph dispatch",
    status: "coming_soon",
    badge: "Coming Soon",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Client chat & link delivery",
    status: "coming_soon",
    badge: "Coming Soon",
  },
]

export function SendDocumentDialog({
  open,
  onOpenChange,
  documentType,
  documentTitle,
  defaultRecipientEmail = "",
  shareUrl: initialShareUrl,
  onFinalizeAndGetShareUrl,
}: SendDocumentDialogProps) {
  const [selectedMedium, setSelectedMedium] =
    React.useState<MediumType>("gmail")
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
      setStatusMessage(null)
    }
  }, [open, defaultRecipientEmail, initialShareUrl])

  const ensureShareUrl = async (email?: string): Promise<string> => {
    if (activeShareUrl) return activeShareUrl
    if (onFinalizeAndGetShareUrl) {
      const url = await onFinalizeAndGetShareUrl(email)
      setActiveShareUrl(url)
      return url
    }
    throw new Error(
      `Unable to create ${documentType} link. Finalize the document before sending it.`
    )
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
      const url = await ensureShareUrl(trimmedEmail)

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
      const url = await ensureShareUrl(trimmedEmail)
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="gap-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-[10px] text-primary uppercase tracking-wider">
              {documentType}
            </span>
          </div>
          <DialogTitle className="font-semibold text-lg tracking-tight">
            Send {documentType === "proposal" ? "Proposal" : "Invoice"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Choose a delivery medium and configure message details before
            dispatching.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Delivery Medium Selection */}
          <div className="flex flex-col gap-2">
            <label className="font-medium text-foreground text-xs">
              Delivery Medium
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MEDIUM_OPTIONS.map((medium) => {
                const isSelected = selectedMedium === medium.id
                const isAvailable = medium.status === "available"
                return (
                  <button
                    key={medium.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setSelectedMedium(medium.id)}
                    className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : isAvailable
                          ? "border-border/70 bg-card hover:border-primary/40 hover:bg-accent/40 cursor-pointer"
                          : "border-border/30 bg-muted/20 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">
                        {medium.name}
                      </span>
                      {isSelected && (
                        <span className="flex h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      {medium.description}
                    </span>
                    {medium.badge && (
                      <span
                        className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
                          isAvailable
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {medium.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form for active medium (Gmail) */}
          {selectedMedium === "gmail" && (
            <form
              onSubmit={handleSendViaGmail}
              className="flex flex-col gap-3 border-t pt-3"
            >
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="recipient-email"
                  className="font-medium text-foreground text-xs"
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
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="email-subject"
                  className="font-medium text-foreground text-xs"
                >
                  Subject Line
                </label>
                <input
                  id="email-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="personal-message"
                  className="font-medium text-foreground text-xs"
                >
                  Message Note
                </label>
                <textarea
                  id="personal-message"
                  rows={5}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className="custom-scrollbar w-full min-h-[140px] rounded-lg border border-input bg-background p-3 text-xs outline-none focus:ring-1 focus:ring-ring resize-y"
                  placeholder="Add a personal note to your recipient..."
                />
              </div>

              {statusMessage && (
                <div
                  className={`rounded-lg border p-2.5 text-xs ${
                    statusMessage.startsWith("Error")
                      ? "border-destructive/20 bg-destructive/10 text-destructive"
                      : statusMessage.startsWith("Successfully")
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {statusMessage.startsWith("Successfully") && (
                    <IconCircleCheck className="mr-1 inline size-3.5 shrink-0" />
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
                  <IconGear className="mr-1 size-3" />
                  Open in Gmail Web
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  className="text-xs gap-1"
                  disabled={sendGmailMutation.isPending}
                >
                  <HugeiconsIcon icon={Share01Icon} className="size-3.5" />
                  {sendGmailMutation.isPending
                    ? "Sending..."
                    : "Send via Gmail API"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
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
