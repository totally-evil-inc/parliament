import { toolDefinition } from "@tanstack/ai"
import { sendDocumentInput, sendDocumentOutput } from "@workspace/agent"
import { logWideEvent } from "@workspace/logger"
import { sendGmailMessage } from "../../lib/gmail/send-service"
import { finalizeInvoiceSend, finalizeProposalSend } from "../document-send"
import type { AgentContext } from "../tool-ctx"

export function sendProposalTool(ctx: AgentContext) {
  return toolDefinition({
    name: "send_proposal",
    description:
      "Finalize a proposal draft and email it to the recipient through Gmail with a public link. Requires human approval before sending.",
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
      const htmlText = `<p>Hello,</p><p>Please review the proposal <strong>${finalized.documentTitle}</strong> from ${ctx.orgName}:</p><p><a href="${finalized.shareUrl}">View Proposal</a></p>${args.personalMessage ? `<p>${args.personalMessage}</p>` : ""}`

      let messageId: string | undefined
      let threadId: string | undefined

      try {
        const dispatchResult = await sendGmailMessage({
          userId: ctx.userId,
          to: recipientEmail,
          subject,
          htmlText,
        })
        messageId = dispatchResult.id
        threadId = dispatchResult.threadId
      } catch (err: unknown) {
        logWideEvent({
          event: "agent.document.sent",
          outcome: "failure",
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          metadata: {
            documentId: args.documentId,
            type: "proposal",
            error: err instanceof Error ? err.message : "Gmail dispatch failed",
          },
        })
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
      "Finalize an invoice draft and email it to the recipient through Gmail with a public link. Requires human approval before sending.",
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
      const htmlText = `<p>Hello,</p><p>Please review the invoice <strong>${finalized.documentTitle}</strong> from ${ctx.orgName}:</p><p><a href="${finalized.shareUrl}">View Invoice</a></p>${args.personalMessage ? `<p>${args.personalMessage}</p>` : ""}`

      let messageId: string | undefined
      let threadId: string | undefined

      try {
        const dispatchResult = await sendGmailMessage({
          userId: ctx.userId,
          to: recipientEmail,
          subject,
          htmlText,
        })
        messageId = dispatchResult.id
        threadId = dispatchResult.threadId
      } catch (err: unknown) {
        logWideEvent({
          event: "agent.document.sent",
          outcome: "failure",
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          metadata: {
            documentId: args.documentId,
            type: "invoice",
            error: err instanceof Error ? err.message : "Gmail dispatch failed",
          },
        })
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
