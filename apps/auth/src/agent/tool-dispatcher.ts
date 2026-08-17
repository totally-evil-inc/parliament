import {
  type ToolCapability,
  type ToolEntry,
  type ToolGroupId,
  type ToolName,
  TOOL_CATALOG,
  getToolsForGroups,
} from "@workspace/agent"
import { logWideEvent } from "@workspace/logger"
import type { ToolSet } from "ai"
import pLimit from "p-limit"
import type { AgentContext } from "./tool-ctx"

// Import existing underlying execution logic
import { gcalCancelEventTool, gcalCreateEventTool, gcalListEventsTool } from "./tools/calendar"
import { customerAnalyticsTool, customerDetailsTool, listCustomersTool } from "./tools/customers"
import { dealAnalyticsTool, listDealsTool } from "./tools/deals"
import {
  createInvoiceTool,
  createProposalTool,
  getInvoiceTool,
  getProposalTool,
  updateInvoiceTool,
  updateProposalTool,
} from "./tools/document-drafts"
import {
  cancelScheduledDispatchTool,
  listScheduledDispatchesTool,
  scheduleDocumentSendTool,
} from "./tools/document-schedule"
import { sendInvoiceTool, sendProposalTool } from "./tools/document-send"
import {
  getInvoiceSummaryTool,
  getProposalSummaryTool,
  listInvoicesTool,
  listProposalsTool,
} from "./tools/documents"
import { gmailCreateDraftTool, gmailSendEmailTool } from "./tools/gmail"
import { listIntegrationsTool } from "./tools/integrations"
import { verifyOrgAccessTool } from "./tools/org"
import { askClarifyingQuestionsTool } from "./tools/questionnaire"
import { getCurrentUserNameTool } from "./tools/user"

export interface ServerToolDefinition {
  name: ToolName
  description: string
  inputSchema: any
  category: "read" | "mutate"
  capability: ToolCapability
  group: ToolGroupId
  needsApproval: boolean
  execute: (args: unknown, ctx: AgentContext) => Promise<unknown>
}

/**
 * Registry of all server tool execution handlers.
 */
function createToolExecutorMap(ctx: AgentContext): Map<ToolName, (args: any) => Promise<any>> {
  const map = new Map<ToolName, (args: any) => Promise<any>>()

  // Helper to extract execute from existing tool factory
  const register = (toolName: ToolName, factory: (c: AgentContext) => any) => {
    const instance = factory(ctx)
    // TanStack server tool defines handler on instance
    const handler = instance["~server"] || instance.execute || instance._serverFn
    if (typeof handler === "function") {
      map.set(toolName, (args: any) => handler(args))
    } else {
      // Fallback
      map.set(toolName, async (args: any) => {
        if (typeof instance === "function") return instance(args)
        return instance
      })
    }
  }

  register("get_current_user_name", getCurrentUserNameTool)
  register("verify_org_access", verifyOrgAccessTool)
  register("ask_clarifying_questions", askClarifyingQuestionsTool)
  register("list_integrations", listIntegrationsTool)
  register("list_deals", listDealsTool)
  register("deal_analytics", dealAnalyticsTool)
  register("list_customers", listCustomersTool)
  register("customer_analytics", customerAnalyticsTool)
  register("customer_details", customerDetailsTool)
  register("list_proposals", listProposalsTool)
  register("list_invoices", listInvoicesTool)
  register("get_proposal_summary", getProposalSummaryTool)
  register("get_invoice_summary", getInvoiceSummaryTool)
  register("get_proposal", getProposalTool)
  register("get_invoice", getInvoiceTool)
  register("create_proposal", createProposalTool)
  register("create_invoice", createInvoiceTool)
  register("update_proposal", updateProposalTool)
  register("update_invoice", updateInvoiceTool)
  register("schedule_document_send", scheduleDocumentSendTool)
  register("cancel_scheduled_dispatch", cancelScheduledDispatchTool)
  register("list_scheduled_dispatches", listScheduledDispatchesTool)
  register("send_proposal", sendProposalTool)
  register("send_invoice", sendInvoiceTool)
  register("gmail_send_email", gmailSendEmailTool)
  register("gmail_create_draft", gmailCreateDraftTool)
  register("gcal_list_events", gcalListEventsTool)
  register("gcal_create_event", gcalCreateEventTool)
  register("gcal_cancel_event", gcalCancelEventTool)

  return map
}

export class ToolDispatcher {
  private concurrency = pLimit(4) // Max 4 parallel tool executions

  constructor(private ctx: AgentContext) {}

  /**
   * Resolves CoreTool map formatted for Vercel AI SDK Core (`streamText`).
   * Supports dynamic capability scoping by tool group.
   */
  getToolsForModel(groups: ToolGroupId[] = ["core", "crm", "documents", "dispatch"]): ToolSet {
    const activeToolNames = getToolsForGroups(groups)
    const result: Record<string, any> = {}

    for (const toolName of activeToolNames) {
      const catalogEntry = TOOL_CATALOG[toolName] as ToolEntry
      if (!catalogEntry) continue

      result[toolName] = {
        description: catalogEntry.description,
        parameters: catalogEntry.input as any,
        // Notice: execute is intentionally omitted or handled in custom loop
        // to enable parallel isolation, durable approvals, and context compaction.
      }
    }

    return result as ToolSet
  }

  /**
   * Dispatches a tool call with Zod validation, execution timeout,
   * error isolation, and canonical Wide Event logging.
   */
  async executeTool(
    name: string,
    args: unknown
  ): Promise<{ result: unknown; isError: boolean; approvalRequired?: boolean }> {
    const toolName = name as ToolName
    const catalogEntry = TOOL_CATALOG[toolName] as ToolEntry

    if (!catalogEntry) {
      return {
        result: `Tool error: Tool '${name}' is not recognized in the system catalog.`,
        isError: true,
      }
    }

    // 1. Zod Input Schema Validation Isolation
    const parseResult = catalogEntry.input.safeParse(args)
    if (!parseResult.success) {
      return {
        result: `Parameter Schema Violation for '${name}': ${JSON.stringify(parseResult.error.format())}. Please adjust parameters and try again.`,
        isError: true,
      }
    }

    // 2. Check if Tool is Gated by Human Approval
    if (catalogEntry.needsApproval) {
      return {
        result: {
          status: "pending_approval",
          message: `Action '${name}' requires explicit human approval before execution.`,
        },
        isError: false,
        approvalRequired: true,
      }
    }

    // 3. Execution under Concurrency Limit & Timeout Boundary (30s)
    const executorMap = createToolExecutorMap(this.ctx)
    const executor = executorMap.get(toolName)

    if (!executor) {
      return {
        result: `Internal error: No execution handler registered for '${name}'.`,
        isError: true,
      }
    }

    const startTime = Date.now()

    return this.concurrency(async () => {
      try {
        const timeoutMs = 30_000
        const result = await Promise.race([
          executor(parseResult.data),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs)
          ),
        ])

        logWideEvent({
          event: "agent.tool.called",
          outcome: "success",
          durationMs: Date.now() - startTime,
          organizationId: this.ctx.organizationId,
          userId: this.ctx.userId,
          metadata: { tool: name },
        })

        return {
          result: result ?? {},
          isError: false,
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)

        logWideEvent({
          event: "agent.tool.called",
          outcome: "failure",
          durationMs: Date.now() - startTime,
          organizationId: this.ctx.organizationId,
          userId: this.ctx.userId,
          metadata: {
            tool: name,
            error: errorMessage,
          },
        })

        return {
          result: `Tool execution failed: ${errorMessage}`,
          isError: true,
        }
      }
    })
  }
}
