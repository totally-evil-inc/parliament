import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  EnvelopeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { render } from "@react-email/render"
import type { InvoiceDraft, ProposalDraft } from "@workspace/document/schema"
import { stripHtml } from "@workspace/document/text"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
import { generateDocumentPdfBase64 } from "@/features/documents/pdf/pdf-exporter"
import { authClient } from "@/lib/auth-client"
import { DocumentDispatchEmail } from "../../email/templates/DocumentDispatchEmail"
import { useSendGmailEmail } from "../hooks/use-gmail-operations"
import { useScheduleDocumentDispatch } from "../hooks/use-scheduled-dispatches"
import { generateGoogleWebComposeUrl } from "../utils/mailto-generator"
import { ComposerAttachmentCard } from "./composer/composer-attachment-card"
import {
  createRecipientFromEmail,
  RecipientRow,
  SenderRow,
} from "./composer/composer-recipient-field"
import { ComposerToolbar } from "./composer/composer-toolbar"
import type {
  AttachmentType,
  ComposerAttachment,
  ComposerRecipient,
  SendDocumentDialogProps,
} from "./composer/composer-types"

function getFileTypeFromName(name: string): AttachmentType {
  const lower = name.toLowerCase()
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "pptx"
  if (
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".csv")
  )
    return "xlsx"
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "docx"
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp")
  )
    return "image"
  return "file"
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

export function SendDocumentDialog({
  open,
  onOpenChange,
  documentType,
  documentTitle,
  documentId,
  document: initialDocument,
  defaultRecipientEmail = "",
  shareUrl: initialShareUrl,
  onFinalizeAndGetShareUrl,
}: SendDocumentDialogProps) {
  const session = authClient.useSession()
  const currentUser = session.data?.user

  const [isExpanded, setIsExpanded] = React.useState(false)
  const [toRecipients, setToRecipients] = React.useState<ComposerRecipient[]>(
    []
  )
  const [ccRecipients, setCcRecipients] = React.useState<ComposerRecipient[]>(
    []
  )
  const [bccRecipients, setBccRecipients] = React.useState<ComposerRecipient[]>(
    []
  )
  const [isCcOpen, setIsCcOpen] = React.useState(false)
  const [isBccOpen, setIsBccOpen] = React.useState(false)

  const [subject, setSubject] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [attachments, setAttachments] = React.useState<ComposerAttachment[]>([])
  const [includePdf, setIncludePdf] = React.useState(false)
  const [finalizedDoc, setFinalizedDoc] = React.useState<
    ProposalDraft | InvoiceDraft | null
  >(initialDocument || null)

  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [activeShareUrl, setActiveShareUrl] = React.useState<string | null>(
    initialShareUrl || null
  )

  const sendGmailMutation = useSendGmailEmail()
  const scheduleMutation = useScheduleDocumentDispatch()

  const defaultSubject = React.useMemo(() => {
    return `${documentType === "proposal" ? "Proposal" : "Invoice"}: ${documentTitle}`
  }, [documentType, documentTitle])

  const defaultBody = React.useMemo(() => {
    const senderName = currentUser?.name || "Parliament Team"
    if (documentType === "proposal") {
      return `Hi,\n\nI've finalized and shared the proposal for "${documentTitle}". You can review the scope of work, deliverables, and complete the digital signature through the client gate link:\n\nPlease review and let me know if you have any questions or adjustments.\n\nLooking forward to working together!\n\nBest regards,\n${senderName}`
    }
    return `Hi,\n\nPlease find the invoice for "${documentTitle}". You can review the itemized breakdown and complete payment directly through the secure client gate link:\n\nThank you for your business!\n\nBest regards,\n${senderName}`
  }, [documentType, documentTitle, currentUser?.name])

  // Initialize or reset composer state on open
  React.useEffect(() => {
    if (open) {
      const initialTo: ComposerRecipient[] = []
      if (defaultRecipientEmail?.trim()) {
        initialTo.push(createRecipientFromEmail(defaultRecipientEmail.trim()))
      }
      setToRecipients(initialTo)
      setCcRecipients([])
      setBccRecipients([])
      setIsCcOpen(false)
      setIsBccOpen(false)
      setSubject(defaultSubject)
      setMessage(defaultBody)
      setStatusMessage(null)
      setErrorMessage(null)
      setIncludePdf(false)
      setFinalizedDoc(initialDocument || null)

      if (initialShareUrl) {
        setActiveShareUrl(initialShareUrl)
      }

      // Primary client gate document attachment
      const primaryAttachment: ComposerAttachment = {
        id: "primary-gate-document",
        name: documentTitle,
        size:
          documentType === "proposal"
            ? "Client Gate • Review & Sign"
            : "Client Gate • Review & Pay",
        type: "gate",
        url: initialShareUrl || undefined,
        isPrimary: true,
      }
      setAttachments([primaryAttachment])
    }
  }, [
    open,
    defaultRecipientEmail,
    defaultSubject,
    defaultBody,
    initialShareUrl,
    initialDocument,
    documentTitle,
    documentType,
  ])

  const handleToggleIncludePdf = (checked: boolean) => {
    setIncludePdf(checked)
    if (checked) {
      const cleanTitle =
        stripHtml(documentTitle)
          .trim()
          .replace(/[^\w.-]/g, "_") || "document"
      const pdfAttachment: ComposerAttachment = {
        id: "dynamic-pdf-attachment",
        name: `${cleanTitle}.pdf`,
        size: "PDF Document Attachment",
        type: "pdf",
        isPrimary: false,
      }
      setAttachments((prev) => [
        ...prev.filter((a) => a.id !== "dynamic-pdf-attachment"),
        pdfAttachment,
      ])
    } else {
      setAttachments((prev) =>
        prev.filter((a) => a.id !== "dynamic-pdf-attachment")
      )
    }
  }

  const ensureShareUrlAndDoc = async (
    recipientEmail?: string
  ): Promise<{
    shareUrl: string
    doc: ProposalDraft | InvoiceDraft | null
  }> => {
    let url = activeShareUrl
    let doc = finalizedDoc || initialDocument || null

    if (!url && onFinalizeAndGetShareUrl) {
      const res = await onFinalizeAndGetShareUrl(recipientEmail)
      if (typeof res === "string") {
        url = res
      } else {
        url = res.shareUrl
        if (res.document) {
          doc = res.document
          setFinalizedDoc(res.document)
        }
      }
      setActiveShareUrl(url)
      setAttachments((prev) =>
        prev.map((att) =>
          att.isPrimary ? { ...att, url: url ?? undefined } : att
        )
      )
    }

    if (!url) {
      throw new Error(
        `Unable to create ${documentType} client gate link. Finalize the document before sending it.`
      )
    }

    return { shareUrl: url, doc }
  }

  const ensureShareUrl = async (recipientEmail?: string): Promise<string> => {
    const { shareUrl } = await ensureShareUrlAndDoc(recipientEmail)
    return shareUrl
  }

  const handleAddAttachmentFiles = (files: FileList) => {
    const newItems: ComposerAttachment[] = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      size: formatBytes(file.size),
      type: getFileTypeFromName(file.name),
    }))
    setAttachments((prev) => [...prev, ...newItems])
  }

  const handleRemoveAttachment = (id: string) => {
    if (id === "dynamic-pdf-attachment") {
      setIncludePdf(false)
    }
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleInsertGreeting = (snippet: string) => {
    setMessage((prev) => `${snippet}\n\n${prev}`)
  }

  const handleInsertSignature = () => {
    const senderName = currentUser?.name || "Parliament Workspace"
    const senderEmail = currentUser?.email || ""
    setMessage(
      (prev) =>
        `${prev.trim()}\n\n--\n${senderName}${senderEmail ? `\n${senderEmail}` : ""}`
    )
  }

  const handleDiscardDraft = () => {
    setToRecipients([])
    setCcRecipients([])
    setBccRecipients([])
    setSubject(defaultSubject)
    setMessage(defaultBody)
    setStatusMessage(null)
    setErrorMessage(null)
    setIncludePdf(false)
    setAttachments((prev) => prev.filter((a) => a.isPrimary))
  }

  const handleCopyShareLink = async () => {
    try {
      const targetEmail = toRecipients[0]?.email
      const url = await ensureShareUrl(targetEmail)
      await navigator.clipboard.writeText(url)
      setStatusMessage("Client gate link copied to clipboard")
      setErrorMessage(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to copy link"
      setErrorMessage(msg)
    }
  }

  const handleSendViaGmail = async () => {
    setErrorMessage(null)
    setStatusMessage(null)

    if (toRecipients.length === 0) {
      setErrorMessage("Please specify at least one recipient email address.")
      return
    }

    const primaryTo = toRecipients.map((r) => r.email).join(", ")

    try {
      setStatusMessage("Generating client gate link...")
      const { shareUrl: url, doc } = await ensureShareUrlAndDoc(
        toRecipients[0]?.email
      )

      setStatusMessage("Rendering dispatch email template...")
      const htmlBody = await render(
        React.createElement(DocumentDispatchEmail, {
          documentType,
          documentTitle,
          personalMessage: message.trim(),
          shareUrl: url,
          recipientEmail: primaryTo,
        })
      )

      let attachment:
        | {
            filename: string
            mimeType: "application/pdf"
            content: string
          }
        | undefined

      if (includePdf) {
        if (!doc) {
          throw new Error(
            "Document snapshot is required to generate the PDF attachment."
          )
        }
        setStatusMessage("Generating PDF attachment...")
        const base64 = await generateDocumentPdfBase64({
          document: doc,
        })
        const cleanTitle =
          stripHtml(documentTitle)
            .trim()
            .replace(/[^\w.-]/g, "_") || "document"
        attachment = {
          filename: `${cleanTitle}.pdf`,
          mimeType: "application/pdf",
          content: base64,
        }
      }

      setStatusMessage("Sending email via Gmail API...")
      await sendGmailMutation.mutateAsync({
        to: primaryTo,
        subject: subject.trim() || defaultSubject,
        htmlText: htmlBody,
        attachment,
      })

      setStatusMessage(`Sent via Gmail to ${primaryTo}!`)
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send email"
      setErrorMessage(msg)
      setStatusMessage(null)
    }
  }

  const handleScheduleSend = async (scheduledDate: Date, timeLabel: string) => {
    setErrorMessage(null)
    setStatusMessage(null)

    if (toRecipients.length === 0) {
      setErrorMessage(
        "Please specify at least one recipient email address before scheduling."
      )
      return
    }

    if (!documentId) {
      setErrorMessage("Document ID is required to schedule dispatch.")
      return
    }

    if (scheduledDate.getTime() <= Date.now()) {
      setErrorMessage("Scheduled time must be in the future.")
      return
    }

    if (!subject.trim() && !defaultSubject) {
      setErrorMessage("Please enter an email subject.")
      return
    }

    if (!message.trim()) {
      setErrorMessage("Please enter an email message note.")
      return
    }

    const primaryTo = toRecipients[0].email
    const ccList = ccRecipients.map((r) => r.email)
    const bccList = bccRecipients.map((r) => r.email)

    try {
      setStatusMessage(`Scheduling dispatch for ${timeLabel}...`)
      await scheduleMutation.mutateAsync({
        documentType,
        documentId,
        documentTitle,
        recipientEmail: primaryTo,
        ccRecipients: ccList,
        bccRecipients: bccList,
        subject: subject.trim() || defaultSubject,
        message: message.trim(),
        scheduledFor: scheduledDate.toISOString(),
        sendMethod: "gmail",
        includePdf,
      })

      setStatusMessage(`Successfully scheduled for ${timeLabel}!`)
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to schedule document send"
      setErrorMessage(msg)
      setStatusMessage(null)
    }
  }

  const handleOpenInGmailWeb = async () => {
    setErrorMessage(null)
    if (toRecipients.length === 0) {
      setErrorMessage("Please specify at least one recipient email address.")
      return
    }

    try {
      const primaryTo = toRecipients.map((r) => r.email).join(", ")
      const url = await ensureShareUrl(toRecipients[0]?.email)
      const bodyText = `${message}\n\nClient Gate Link: ${url}`
      const composeUrl = generateGoogleWebComposeUrl({
        to: primaryTo,
        subject: subject.trim() || defaultSubject,
        body: bodyText,
      })

      window.open(composeUrl, "_blank", "noopener,noreferrer")
      setStatusMessage("Opened compose window in Gmail Web")
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to generate compose URL"
      setErrorMessage(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 overflow-hidden border-border/80 bg-background p-0 shadow-xl transition-all duration-200",
          isExpanded
            ? "h-[88vh] max-h-[850px] sm:max-w-4xl"
            : "h-[85vh] max-h-[640px] sm:max-w-2xl"
        )}
      >
        {/* 1. Header Bar (Fixed) */}
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-border/50 border-b px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg border border-border/80 bg-muted/50 text-foreground">
              <EnvelopeIcon className="size-4" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2 font-semibold text-foreground text-sm tracking-tight">
                Compose New Email
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-[10px] text-primary uppercase tracking-wider">
                  {documentType}
                </span>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Compose and dispatch your {documentType} to clients with
                attached client gate link and review details.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground"
              aria-label={isExpanded ? "Collapse modal" : "Expand modal"}
            >
              {isExpanded ? (
                <ArrowsPointingInIcon className="size-3.5" />
              ) : (
                <ArrowsPointingOutIcon className="size-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close dialog"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        </DialogHeader>

        {/* 2. Sender, Recipients & Subject Rows (Fixed top) */}
        <div className="flex shrink-0 flex-col">
          {/* Sender row ("From") */}
          <SenderRow user={currentUser} />

          {/* Recipient row ("To") */}
          <RecipientRow
            label="To"
            recipients={toRecipients}
            onAddRecipient={(rec) => setToRecipients((prev) => [...prev, rec])}
            onRemoveRecipient={(id) =>
              setToRecipients((prev) => prev.filter((r) => r.id !== id))
            }
            showCcToggle={true}
            showBccToggle={true}
            isCcOpen={isCcOpen}
            isBccOpen={isBccOpen}
            onToggleCc={() => setIsCcOpen(true)}
            onToggleBcc={() => setIsBccOpen(true)}
            placeholder="Add client email..."
          />

          {/* Cc row (conditional) */}
          {isCcOpen && (
            <RecipientRow
              label="Cc"
              recipients={ccRecipients}
              onAddRecipient={(rec) =>
                setCcRecipients((prev) => [...prev, rec])
              }
              onRemoveRecipient={(id) =>
                setCcRecipients((prev) => prev.filter((r) => r.id !== id))
              }
              placeholder="Add CC email..."
            />
          )}

          {/* Bcc row (conditional) */}
          {isBccOpen && (
            <RecipientRow
              label="Bcc"
              recipients={bccRecipients}
              onAddRecipient={(rec) =>
                setBccRecipients((prev) => [...prev, rec])
              }
              onRemoveRecipient={(id) =>
                setBccRecipients((prev) => prev.filter((r) => r.id !== id))
              }
              placeholder="Add BCC email..."
            />
          )}

          {/* Subject Input */}
          <div className="border-border/40 border-b px-3 py-2.5">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject..."
              className="w-full bg-transparent font-semibold text-foreground text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* 3. Dedicated Scrollable Message Body & Attachments Area */}
        <ScrollArea className="min-h-0 w-full flex-1">
          <div className="flex min-h-full flex-col p-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your email message note..."
              className="no-scrollbar min-h-[140px] w-full flex-1 resize-none border-none bg-transparent p-0 text-foreground text-xs leading-relaxed outline-none placeholder:text-muted-foreground/60 focus:ring-0 sm:text-sm"
            />

            {/* Attachments & Client Gate Links Section */}
            {attachments.length > 0 && (
              <div className="pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  {attachments.map((att) => (
                    <ComposerAttachmentCard
                      key={att.id}
                      attachment={att}
                      onRemove={handleRemoveAttachment}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 4. Status Alerts (if any) */}
        {errorMessage && (
          <div className="mx-3 my-2 flex shrink-0 items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-destructive text-xs">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="size-4 cursor-pointer hover:opacity-80"
            >
              <XMarkIcon className="size-3.5" />
            </button>
          </div>
        )}

        {statusMessage && !errorMessage && (
          <div className="mx-3 my-2 flex shrink-0 items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-600 text-xs dark:text-emerald-400">
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="size-4 cursor-pointer hover:opacity-80"
            >
              <XMarkIcon className="size-3.5" />
            </button>
          </div>
        )}

        {/* 5. Footer Action Toolbar (Fixed bottom) */}
        <div className="shrink-0 border-border/40 border-t bg-muted/20 px-3 py-2 sm:px-4">
          <ComposerToolbar
            isSending={sendGmailMutation.isPending}
            isDraftSaved={true}
            statusMessage={sendGmailMutation.isPending ? "Sending..." : null}
            documentType={documentType}
            includePdf={includePdf}
            onToggleIncludePdf={handleToggleIncludePdf}
            onSend={handleSendViaGmail}
            onOpenGmailWeb={handleOpenInGmailWeb}
            onCopyShareLink={handleCopyShareLink}
            onAttachFile={handleAddAttachmentFiles}
            onInsertGreeting={handleInsertGreeting}
            onInsertSignature={handleInsertSignature}
            onDiscardDraft={handleDiscardDraft}
            onScheduleSend={handleScheduleSend}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default SendDocumentDialog
