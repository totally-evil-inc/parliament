import {
  getToolsForGroups,
  TOOL_CATALOG,
  type ToolEntry,
  type ToolGroupId,
  type ToolName,
} from "@workspace/agent"
import { logger, logWideEvent } from "@workspace/logger"
import type { ToolSet } from "ai"
import type { AgentContext } from "./tool-ctx"

// Import existing underlying execution logic
import {
  gcalCancelEventTool,
  gcalCreateEventTool,
  gcalListEventsTool,
} from "./tools/calendar"
import {
  createCustomerTool,
  customerAnalyticsTool,
  customerDetailsTool,
  listCustomersTool,
  updateCustomerTool,
} from "./tools/customers"
import {
  createDealTool,
  dealAnalyticsTool,
  listDealsTool,
  updateDealStageTool,
} from "./tools/deals"
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

/**
 * Maps static tool names to their runtime executable handlers.
 */
function createToolExecutorMap(
  ctx: AgentContext
): Map<ToolName, (args: any) => Promise<any>> {
  const map = new Map<ToolName, (args: any) => Promise<any>>()

  const register = (name: ToolName, toolFactory: (c: AgentContext) => any) => {
    const definedTool = toolFactory(ctx)
    // TanStack AI toolDefinition returns a structure with .server handler
    if (typeof definedTool?.server === "function") {
      map.set(name, (args: any) => definedTool.server(args))
    } else if (typeof definedTool?.execute === "function") {
      map.set(name, (args: any) => definedTool.execute(args))
    }
  }

  // Core
  register("get_current_user_name", getCurrentUserNameTool)
  register("verify_org_access", verifyOrgAccessTool)
  register("ask_clarifying_questions", askClarifyingQuestionsTool)
  register("list_integrations", listIntegrationsTool)

  // CRM Deals
  register("list_deals", listDealsTool)
  register("deal_analytics", dealAnalyticsTool)
  register("create_deal", createDealTool)
  register("update_deal_stage", updateDealStageTool)

  // CRM Customers
  register("list_customers", listCustomersTool)
  register("customer_analytics", customerAnalyticsTool)
  register("customer_details", customerDetailsTool)
  register("create_customer", createCustomerTool)
  register("update_customer", updateCustomerTool)

  // Documents Read
  register("list_proposals", listProposalsTool)
  register("list_invoices", listInvoicesTool)
  register("get_proposal_summary", getProposalSummaryTool)
  register("get_invoice_summary", getInvoiceSummaryTool)
  register("get_proposal", getProposalTool)
  register("get_invoice", getInvoiceTool)

  // Document Authoring
  register("create_proposal", createProposalTool)
  register("create_invoice", createInvoiceTool)
  register("update_proposal", updateProposalTool)
  register("update_invoice", updateInvoiceTool)

  // Scheduled Dispatch
  register("schedule_document_send", scheduleDocumentSendTool)
  register("list_scheduled_dispatches", listScheduledDispatchesTool)
  register("cancel_scheduled_dispatch", cancelScheduledDispatchTool)

  // Instant External Dispatch
  register("send_proposal", sendProposalTool)
  register("send_invoice", sendInvoiceTool)
  register("gmail_send_email", gmailSendEmailTool)
  register("gmail_create_draft", gmailCreateDraftTool)
  register("gcal_list_events", gcalListEventsTool)
  register("gcal_create_event", gcalCreateEventTool)
  register("gcal_cancel_event", gcalCancelEventTool)

  return map
}

function deepUnpackStringifiedJson(val: unknown): unknown {
  if (typeof val === "string") {
    const trimmed = val.trim()
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        return deepUnpackStringifiedJson(parsed)
      } catch {
        return val
      }
    }
    return val
  }
  if (Array.isArray(val)) {
    return val.map((item) => deepUnpackStringifiedJson(item))
  }
  if (val && typeof val === "object") {
    const res: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      res[k] = deepUnpackStringifiedJson(v)
    }
    return res
  }
  return val
}

export class ToolDispatcher {
  constructor(private ctx: AgentContext) {}

  /**
   * Resolves CoreTool map formatted for Vercel AI SDK Core (`streamText`).
   * Supports dynamic capability scoping by tool group.
   */
  getToolsForModel(
    groups: ToolGroupId[] = ["core", "crm", "documents", "dispatch"]
  ): ToolSet {
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
    args: unknown,
    options?: { skipApprovalGate?: boolean }
  ): Promise<{
    result: unknown
    isError: boolean
    approvalRequired?: boolean
  }> {
    const toolName = name as ToolName
    const catalogEntry = TOOL_CATALOG[toolName] as ToolEntry

    // Unpack / coerce common model payload wraps
    let parsedArgs = deepUnpackStringifiedJson(args)
    if (
      parsedArgs &&
      typeof parsedArgs === "object" &&
      !Array.isArray(parsedArgs)
    ) {
      const obj = parsedArgs as Record<string, unknown>
      if (
        obj.parameters &&
        typeof obj.parameters === "object" &&
        Object.keys(obj).length === 1
      ) {
        parsedArgs = obj.parameters
      } else if (
        obj.input &&
        typeof obj.input === "object" &&
        Object.keys(obj).length === 1
      ) {
        parsedArgs = obj.input
      } else if (
        obj.args &&
        typeof obj.args === "object" &&
        Object.keys(obj).length === 1
      ) {
        parsedArgs = obj.args
      }
    }
    if (parsedArgs === undefined || parsedArgs === null) {
      parsedArgs = {}
    }

    if (!catalogEntry) {
      const errorMessage = `Tool '${name}' is not recognized in the system catalog.`
      logger.warn(
        { tool: name },
        `[Agent Tool] Unrecognized tool called: '${name}'`
      )
      logWideEvent({
        event: "agent.tool.rejected",
        outcome: "failure",
        organizationId: this.ctx.organizationId,
        userId: this.ctx.userId,
        error: {
          code: "tool_not_found",
          message: errorMessage,
        },
        metadata: { tool: name },
      })
      return {
        result: `Tool error: ${errorMessage} Available tools: ${Object.keys(TOOL_CATALOG).join(", ")}`,
        isError: true,
      }
    }

    // 1. Zod Input Schema Validation Isolation
    const parseResult = catalogEntry.input.safeParse(parsedArgs)
    if (!parseResult.success) {
      const issues = parseResult.error.issues
      const formattedIssues = issues
        .map((i) => `• [${i.path.join(".") || "root"}]: ${i.message}`)
        .join("\n")
      const errorMessage = `Parameter Schema Violation for '${name}':\n${formattedIssues}\n\nPlease adjust parameters to match the expected format and try again.`

      logger.error(
        {
          tool: name,
          receivedArgs: parsedArgs,
          issues: issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        `[Agent Tool Validation Error] Parameter schema violation for '${name}'`
      )

      logWideEvent({
        event: "agent.tool.validation_failed",
        outcome: "failure",
        organizationId: this.ctx.organizationId,
        userId: this.ctx.userId,
        error: {
          code: "parameter_schema_violation",
          message: `Schema validation failed for tool '${name}'`,
        },
        metadata: {
          tool: name,
          receivedArgs: parsedArgs,
          issues: issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
          formattedError: parseResult.error.format(),
        },
      })

      return {
        result: errorMessage,
        isError: true,
      }
    }

    // 2. Check if Tool is Gated by Human Approval
    if (catalogEntry.needsApproval && !options?.skipApprovalGate) {
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
      const errorMessage = `No execution handler registered for '${name}'.`
      logger.error(
        { tool: name },
        `[Agent Tool] Missing executor for '${name}'`
      )
      logWideEvent({
        event: "agent.tool.missing_executor",
        outcome: "error",
        organizationId: this.ctx.organizationId,
        userId: this.ctx.userId,
        error: {
          code: "missing_executor",
          message: errorMessage,
        },
        metadata: { tool: name },
      })
      return {
        result: `Internal error: ${errorMessage}`,
        isError: true,
      }
    }

    const startTime = Date.now()
    logger.info(
      { tool: name },
      `[Agent Tool] Executing tool '${name}'`
    )

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    let timedOut = false

    const execution = executor(parseResult.data)
    execution.then(
      () => {
        if (timedOut) {
          logWideEvent({
            event: "agent.tool.late_completion",
            outcome: "success",
            durationMs: Date.now() - startTime,
            organizationId: this.ctx.organizationId,
            userId: this.ctx.userId,
            metadata: {
              tool: name,
              note: "executor settled after timeout; side effect may have occurred",
            },
          })
        }
      },
      () => {
        if (timedOut) {
          logWideEvent({
            event: "agent.tool.late_completion",
            outcome: "failure",
            durationMs: Date.now() - startTime,
            organizationId: this.ctx.organizationId,
            userId: this.ctx.userId,
            metadata: {
              tool: name,
              note: "executor settled after timeout",
            },
          })
        }
      }
    )

    try {
      const timeoutMs = 30_000
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          timedOut = true
          reject(new Error(`Execution timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      })

      const result = await Promise.race([execution, timeoutPromise])

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
      const stack = err instanceof Error ? err.stack : undefined

      logger.error(
        { tool: name, error: errorMessage, stack, timedOut },
        `[Agent Tool Error] Execution failed for '${name}': ${errorMessage}`
      )

      logWideEvent({
        event: "agent.tool.called",
        outcome: "failure",
        durationMs: Date.now() - startTime,
        organizationId: this.ctx.organizationId,
        userId: this.ctx.userId,
        error: {
          code: timedOut ? "tool_timeout" : "tool_execution_failed",
          message: errorMessage,
          stack,
        },
        metadata: {
          tool: name,
          error: errorMessage,
          timedOut,
        },
      })

      return {
        result: `Tool execution failed: ${errorMessage}`,
        isError: true,
      }
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }
}
