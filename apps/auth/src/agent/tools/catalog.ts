import { type AnyServerTool, convertSchemaToJsonSchema } from "@tanstack/ai"
import { withJsonSchema } from "@workspace/agent"
import { logWideEvent } from "@workspace/logger"
import type { AgentContext } from "../tool-ctx"
import {
  gcalCancelEventTool,
  gcalCreateEventTool,
  gcalListEventsTool,
} from "./calendar"
import {
  customerAnalyticsTool,
  customerDetailsTool,
  listCustomersTool,
} from "./customers"
import { dealAnalyticsTool, listDealsTool } from "./deals"
import {
  createInvoiceTool,
  createProposalTool,
  getInvoiceTool,
  getProposalTool,
  updateInvoiceTool,
  updateProposalTool,
} from "./document-drafts"
import {
  cancelScheduledDispatchTool,
  listScheduledDispatchesTool,
  scheduleDocumentSendTool,
} from "./document-schedule"
import { sendInvoiceTool, sendProposalTool } from "./document-send"
import {
  getInvoiceSummaryTool,
  getProposalSummaryTool,
  listInvoicesTool,
  listProposalsTool,
} from "./documents"
import { gmailCreateDraftTool, gmailSendEmailTool } from "./gmail"
import { listIntegrationsTool } from "./integrations"
import { verifyOrgAccessTool } from "./org"
import { askClarifyingQuestionsTool } from "./questionnaire"
import { getCurrentUserNameTool } from "./user"

/**
 * Builds the full server tool set for a turn (02-§2 step 5, 04-§2).
 *
 * Every tool impl closes over `ctx`, making all access org-scoped. Approval
 * policy per 04-§6: all mutating tools `needsApproval: true` except
 * `gmail_create_draft`, `create_proposal`, `create_invoice`, `update_proposal`,
 * `update_invoice`, and `ask_clarifying_questions`.
 */
export function buildAgentTools(ctx: AgentContext): AnyServerTool[] {
  const tools: AnyServerTool[] = [
    getCurrentUserNameTool(ctx),
    verifyOrgAccessTool(ctx),
    askClarifyingQuestionsTool(ctx),
    listDealsTool(ctx),
    dealAnalyticsTool(ctx),
    listCustomersTool(ctx),
    customerAnalyticsTool(ctx),
    customerDetailsTool(ctx),
    listProposalsTool(ctx),
    listInvoicesTool(ctx),
    getProposalSummaryTool(ctx),
    getInvoiceSummaryTool(ctx),
    getProposalTool(ctx),
    getInvoiceTool(ctx),
    createProposalTool(ctx),
    createInvoiceTool(ctx),
    updateProposalTool(ctx),
    updateInvoiceTool(ctx),
    scheduleDocumentSendTool(ctx),
    listScheduledDispatchesTool(ctx),
    cancelScheduledDispatchTool(ctx),
    listIntegrationsTool(ctx),
    sendProposalTool(ctx),
    sendInvoiceTool(ctx),
    gmailSendEmailTool(ctx),
    gmailCreateDraftTool(ctx),
    gcalListEventsTool(ctx),
    gcalCreateEventTool(ctx),
    gcalCancelEventTool(ctx),
  ]

  return tools.map((tool) => wrapToolExecution(tool, ctx))
}

/** Wraps each server tool with an `agent.tool.called` wide event (07-§4). */
function wrapToolExecution<T extends AnyServerTool>(
  tool: T,
  ctx: AgentContext
): T {
  if (tool.inputSchema) {
    withJsonSchema(tool.inputSchema as any)
    const converted = convertSchemaToJsonSchema(tool.inputSchema as any)
    if (converted) {
      tool.inputSchema = converted as any
    }
  }
  if (tool.outputSchema) {
    withJsonSchema(tool.outputSchema as any)
    const converted = convertSchemaToJsonSchema(tool.outputSchema as any)
    if (converted) {
      tool.outputSchema = converted as any
    }
  }

  const original = (
    tool as T & { execute: (args: unknown) => Promise<unknown> }
  ).execute
  if (typeof original !== "function") return tool

  const wrapped = async (args: unknown) => {
    const startTime = Date.now()
    try {
      const result = await original.call(tool, args)
      // TanStack AI serializes tool results into AG-UI string content. An
      // undefined result becomes undefined wire content and later crashes the
      // client message converter when it calls `.filter()` on tool content.
      const safeResult = result === undefined ? {} : result
      logWideEvent({
        event: "agent.tool.called",
        outcome: "success",
        durationMs: Date.now() - startTime,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        metadata: { tool: tool.name },
      })
      return safeResult
    } catch (err: unknown) {
      logWideEvent({
        event: "agent.tool.called",
        outcome: "failure",
        durationMs: Date.now() - startTime,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        metadata: {
          tool: tool.name,
          error: err instanceof Error ? err.message : String(err),
        },
      })
      throw err
    }
  }

  ;(tool as T & { execute: (args: unknown) => Promise<unknown> }).execute =
    wrapped
  return tool
}
