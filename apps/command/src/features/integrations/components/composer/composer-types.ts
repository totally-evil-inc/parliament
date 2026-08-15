import type { InvoiceDraft, ProposalDraft } from "@workspace/document/schema"

export interface ComposerRecipient {
  id: string
  email: string
  name?: string
  avatarUrl?: string
}

export type AttachmentType =
  | "gate"
  | "pdf"
  | "pptx"
  | "xlsx"
  | "docx"
  | "image"
  | "file"

export interface ComposerAttachment {
  id: string
  name: string
  size: string
  type: AttachmentType
  url?: string
  isPrimary?: boolean
}

export type SendMediumType = "gmail" | "gmail_web" | "outlook" | "whatsapp"

export interface SendMediumOption {
  id: SendMediumType
  name: string
  description: string
  status: "available" | "coming_soon"
  badge?: string
}

export interface FinalizeAndShareResult {
  shareUrl: string
  document?: ProposalDraft | InvoiceDraft
}

export interface SendDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentType: "proposal" | "invoice"
  documentTitle: string
  documentId?: string
  document?: ProposalDraft | InvoiceDraft
  defaultRecipientEmail?: string
  shareUrl?: string
  onFinalizeAndGetShareUrl?: (
    recipientEmail?: string
  ) => Promise<string | FinalizeAndShareResult>
}
