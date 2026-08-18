import { toolDefinition } from "@tanstack/ai"
import {
  gmailDraftInput,
  gmailDraftOutput,
  gmailSendInput,
  gmailSendOutput,
} from "@workspace/agent"
import { formatMarkdownToEmailHtml } from "../../lib/email"
import {
  createGmailDraft,
  sendGmailMessage,
} from "../../lib/gmail/send-service"
import type { AgentContext } from "../tool-ctx"

function ensureCleanEmailHtml(htmlOrMarkdown?: string): string {
  if (!htmlOrMarkdown) return ""
  // If string contains basic HTML tags, keep it; otherwise parse markdown/newlines to HTML
  if (
    /<(p|div|br|strong|b|em|i|ul|ol|li|table|h[1-6]|a)\b/i.test(htmlOrMarkdown)
  ) {
    return htmlOrMarkdown
  }
  return formatMarkdownToEmailHtml(htmlOrMarkdown)
}

export function gmailSendEmailTool(ctx: AgentContext) {
  return toolDefinition({
    name: "gmail_send_email",
    description:
      "Send a real email through the user's connected Gmail account. Requires human approval before dispatch.",
    inputSchema: gmailSendInput,
    outputSchema: gmailSendOutput,
    needsApproval: true,
  }).server(async (args) => {
    try {
      const htmlBody = ensureCleanEmailHtml(args.htmlText)
      const result = await sendGmailMessage({
        userId: ctx.userId,
        to: args.to,
        subject: args.subject,
        htmlText: htmlBody,
        plainText: args.plainText,
        replyTo: args.replyTo,
      })

      return {
        messageId: result.id,
        threadId: result.threadId,
      }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.message.includes("No connected Google account") ||
          err.message.includes("integration_not_connected"))
      ) {
        return {
          error: {
            code: "integration_not_connected" as const,
            message: "Gmail integration is not connected for this account.",
            provider: "gmail" as const,
          },
        }
      }
      throw err
    }
  })
}

export function gmailCreateDraftTool(ctx: AgentContext) {
  return toolDefinition({
    name: "gmail_create_draft",
    description:
      "Create a draft email in Gmail. Note: with standard gmail.send scope, use gmail_send_email instead to prepare an email with human approval before dispatch.",
    inputSchema: gmailDraftInput,
    outputSchema: gmailDraftOutput,
    needsApproval: false,
  }).server(async (args) => {
    try {
      const htmlBody = ensureCleanEmailHtml(args.htmlText)
      const result = await createGmailDraft({
        userId: ctx.userId,
        to: args.to,
        subject: args.subject,
        htmlText: htmlBody,
        plainText: args.plainText,
      })

      return {
        draftId: result.id,
      }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.message.includes("No connected Google account") ||
          err.message.includes("integration_not_connected"))
      ) {
        return {
          error: {
            code: "integration_not_connected" as const,
            message: "Gmail integration is not connected for this account.",
            provider: "gmail" as const,
          },
        }
      }
      if (
        err instanceof Error &&
        (err.message.includes("insufficient authentication scopes") ||
          err.message.includes("Insufficient Permission") ||
          err.message.includes("403"))
      ) {
        return {
          error: {
            code: "scope_missing" as const,
            message:
              "Gmail draft creation requires the restricted gmail.compose scope. Your integration uses the non-restricted gmail.send scope. Use gmail_send_email to review and send with human approval.",
            provider: "gmail" as const,
          },
        }
      }
      throw err
    }
  })
}
