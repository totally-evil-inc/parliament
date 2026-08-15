import { toolDefinition } from "@tanstack/ai"
import { sendDocumentInput, sendDocumentOutput } from "@workspace/agent"
import { stripHtml } from "@workspace/document/text"
import { generateDocumentPdfBuffer } from "@workspace/document-pdf"
import { logWideEvent } from "@workspace/logger"
import { renderEmail } from "../../lib/email"
import {
  type SendEmailAttachment,
  sendGmailMessage,
} from "../../lib/gmail/send-service"
import { finalizeInvoiceSend, finalizeProposalSend } from "../document-send"
import type { AgentContext } from "../tool-ctx"

export function sendProposalTool(ctx: AgentContext) {
  return toolDefinition({
    name: "send_proposal",
    description:
      "Finalize a proposal draft and email it to the recipient through Gmail with a public link and optional PDF attachment. Requires human approval before sending.",
    inputSchema: sendDocumentInput,
    outputSchema: sendDocumentOutput,
    needsApproval: true,
  }).server(async (args) => {
    try {
      const finalized = await finalizeProposalSend(
        args.documentId,
        ctx.organizationId,
        ctx.userId,
        args.recipientEmail
      )

      const recipientEmail = finalized.recipientEmail
      if (!recipientEmail) {
        return {
          error: {
            code: "validation" as const,
            message: `No recipient email specified for proposal "${finalized.documentTitle}".`,
          },
        }
      }

      const subject =
        args.subject ||
        `Proposal: ${finalized.documentTitle} from ${ctx.orgName}`

      let htmlText: string
      try {
        htmlText = await renderEmail("document-dispatch", {
          documentType: "proposal",
          documentTitle: finalized.documentTitle,
          personalMessage: args.personalMessage || "",
          shareUrl: finalized.shareUrl,
          recipientEmail,
        })
      } catch {
        htmlText = `<p>Hello,</p><p>Please review the proposal <strong>${finalized.documentTitle}</strong> from ${ctx.orgName}:</p><p><a href="${finalized.shareUrl}">View Proposal</a></p>${args.personalMessage ? `<p>${args.personalMessage}</p>` : ""}`
      }

      let attachment: SendEmailAttachment | undefined
      if (args.includePdf && finalized.document) {
        const pdfBuffer = await generateDocumentPdfBuffer({
          document: finalized.document,
        })
        const cleanTitle =
          stripHtml(finalized.documentTitle)
            .trim()
            .replace(/[^\w.-]/g, "_") || "proposal"
        attachment = {
          filename: `${cleanTitle}.pdf`,
          mimeType: "application/pdf",
          content: pdfBuffer.toString("base64"),
        }
      }

      let messageId: string | undefined
      let threadId: string | undefined

      try {
        const dispatchResult = await sendGmailMessage({
          userId: ctx.userId,
          to: recipientEmail,
          subject,
          htmlText,
          attachment,
        })
        messageId = dispatchResult.id
        threadId = dispatchResult.threadId
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Gmail dispatch failed"
        logWideEvent({
          event: "agent.document.sent",
          outcome: "failure",
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          metadata: {
            documentId: args.documentId,
            type: "proposal",
            error: errorMessage,
          },
        })
        return {
          error: {
            code: "provider" as const,
            message: `Failed to deliver proposal email via Gmail: ${errorMessage}`,
            provider: "gmail" as const,
          },
        }
      }

      logWideEvent({
        event: "agent.document.sent",
        outcome: "success",
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        metadata: {
          documentId: args.documentId,
          type: "proposal",
          shareUrl: finalized.shareUrl,
          recipientEmail,
          includePdf: Boolean(args.includePdf),
        },
      })

      return {
        shareUrl: finalized.shareUrl,
        status: "sent" as const,
        messageId,
        threadId,
        documentType: "proposal" as const,
        documentTitle: finalized.documentTitle,
        totalMinorUnits: finalized.totalMinorUnits,
        currency: finalized.currency,
        recipientEmail,
        includedPdf: Boolean(args.includePdf),
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        return {
          error: {
            code: err.message.includes("not found")
              ? ("not_found" as const)
              : ("internal" as const),
            message: err.message,
          },
        }
      }
      throw err
    }
  })
}

export function sendInvoiceTool(ctx: AgentContext) {
  return toolDefinition({
    name: "send_invoice",
    description:
      "Finalize an invoice draft and email it to the recipient through Gmail with a public link and optional PDF attachment. Requires human approval before sending.",
    inputSchema: sendDocumentInput,
    outputSchema: sendDocumentOutput,
    needsApproval: true,
  }).server(async (args) => {
    try {
      const finalized = await finalizeInvoiceSend(
        args.documentId,
        ctx.organizationId,
        ctx.userId,
        args.recipientEmail
      )

      const recipientEmail = finalized.recipientEmail
      if (!recipientEmail) {
        return {
          error: {
            code: "validation" as const,
            message: `No recipient email specified for invoice "${finalized.documentTitle}".`,
          },
        }
      }

      const subject =
        args.subject ||
        `Invoice: ${finalized.documentTitle} from ${ctx.orgName}`

      let htmlText: string
      try {
        htmlText = await renderEmail("document-dispatch", {
          documentType: "invoice",
          documentTitle: finalized.documentTitle,
          personalMessage: args.personalMessage || "",
          shareUrl: finalized.shareUrl,
          recipientEmail,
        })
      } catch {
        htmlText = `<p>Hello,</p><p>Please review the invoice <strong>${finalized.documentTitle}</strong> from ${ctx.orgName}:</p><p><a href="${finalized.shareUrl}">View Invoice</a></p>${args.personalMessage ? `<p>${args.personalMessage}</p>` : ""}`
      }

      let attachment: SendEmailAttachment | undefined
      if (args.includePdf && finalized.document) {
        const pdfBuffer = await generateDocumentPdfBuffer({
          document: finalized.document,
        })
        const cleanTitle =
          stripHtml(finalized.documentTitle)
            .trim()
            .replace(/[^\w.-]/g, "_") || "invoice"
        attachment = {
          filename: `${cleanTitle}.pdf`,
          mimeType: "application/pdf",
          content: pdfBuffer.toString("base64"),
        }
      }

      let messageId: string | undefined
      let threadId: string | undefined

      try {
        const dispatchResult = await sendGmailMessage({
          userId: ctx.userId,
          to: recipientEmail,
          subject,
          htmlText,
          attachment,
        })
        messageId = dispatchResult.id
        threadId = dispatchResult.threadId
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Gmail dispatch failed"
        logWideEvent({
          event: "agent.document.sent",
          outcome: "failure",
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          metadata: {
            documentId: args.documentId,
            type: "invoice",
            error: errorMessage,
          },
        })
        return {
          error: {
            code: "provider" as const,
            message: `Failed to deliver invoice email via Gmail: ${errorMessage}`,
            provider: "gmail" as const,
          },
        }
      }

      logWideEvent({
        event: "agent.document.sent",
        outcome: "success",
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        metadata: {
          documentId: args.documentId,
          type: "invoice",
          shareUrl: finalized.shareUrl,
          recipientEmail,
          includePdf: Boolean(args.includePdf),
        },
      })

      return {
        shareUrl: finalized.shareUrl,
        status: "sent" as const,
        messageId,
        threadId,
        documentType: "invoice" as const,
        documentTitle: finalized.documentTitle,
        totalMinorUnits: finalized.totalMinorUnits,
        currency: finalized.currency,
        recipientEmail,
        includedPdf: Boolean(args.includePdf),
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        return {
          error: {
            code: err.message.includes("not found")
              ? ("not_found" as const)
              : ("internal" as const),
            message: err.message,
          },
        }
      }
      throw err
    }
  })
}
