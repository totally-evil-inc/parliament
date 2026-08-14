import type { z } from "zod"
import { toolInputSchemas, toolOutputSchemas } from "./schemas"

export interface ToolEntry {
  description: string
  input: z.ZodTypeAny
  output: z.ZodTypeAny
  category: "read" | "mutate"
  needsApproval: boolean
  integration?: "gmail" | "google-calendar"
}

/**
 * Single source of truth for the tool surface (04-§1/§2 in ideation/agent-chat).
 * The auth server turns entries into TanStack AI toolDefinitions and OpenUI
 * ToolSpecs; the command app derives the uiToolProvider keys from ToolName.
 */
export const TOOL_CATALOG = {
  // ——— Business reads (auto-run) ———
  list_deals: {
    description:
      "List all deals in the current organization's pipeline with stage, value and expected close date.",
    input: toolInputSchemas.list_deals,
    output: toolOutputSchemas.list_deals,
    category: "read",
    needsApproval: false,
  },
  deal_analytics: {
    description:
      "Pipeline analytics: total pipeline value, closed-won value, conversion rate, average deal size, deals closing this month, monthly pipeline trend and stage breakdown.",
    input: toolInputSchemas.deal_analytics,
    output: toolOutputSchemas.deal_analytics,
    category: "read",
    needsApproval: false,
  },
  list_customers: {
    description:
      "List customers (companies) with revenue and proposal counts in the current organization.",
    input: toolInputSchemas.list_customers,
    output: toolOutputSchemas.list_customers,
    category: "read",
    needsApproval: false,
  },
  customer_analytics: {
    description:
      "Customer analytics: total customers, top revenue client, most active client, inactive count, new customers this month.",
    input: toolInputSchemas.customer_analytics,
    output: toolOutputSchemas.customer_analytics,
    category: "read",
    needsApproval: false,
  },
  customer_details: {
    description:
      "Full customer profile: company fields, contacts, deals and proposals. Accepts a customer id.",
    input: toolInputSchemas.customer_details,
    output: toolOutputSchemas.customer_details,
    category: "read",
    needsApproval: false,
  },
  list_proposals: {
    description:
      "List proposal drafts with status, revision, views, customer, value and acceptance state.",
    input: toolInputSchemas.list_proposals,
    output: toolOutputSchemas.list_proposals,
    category: "read",
    needsApproval: false,
  },
  list_invoices: {
    description:
      "List invoice drafts with status, revision, views, customer, value, due date and invoice number.",
    input: toolInputSchemas.list_invoices,
    output: toolOutputSchemas.list_invoices,
    category: "read",
    needsApproval: false,
  },
  get_proposal_summary: {
    description:
      "Summary of one proposal draft (totals, customer and recipient emails) by id. Use before sending a proposal.",
    input: toolInputSchemas.get_proposal_summary,
    output: toolOutputSchemas.get_proposal_summary,
    category: "read",
    needsApproval: false,
  },
  get_invoice_summary: {
    description:
      "Summary of one invoice draft (totals, dates, customer and recipient emails) by id. Use before sending an invoice.",
    input: toolInputSchemas.get_invoice_summary,
    output: toolOutputSchemas.get_invoice_summary,
    category: "read",
    needsApproval: false,
  },
  gcal_list_events: {
    description:
      "List upcoming events on the user's Google Calendar (default: next 7 days, up to 14).",
    input: toolInputSchemas.gcal_list_events,
    output: toolOutputSchemas.gcal_list_events,
    category: "read",
    needsApproval: false,
    integration: "google-calendar",
  },
  verify_org_access: {
    description:
      "Verify organization context: returns the current organization id and name. Internal diagnostic tool; do not call for conversational queries or greetings.",
    input: toolInputSchemas.verify_org_access,
    output: toolOutputSchemas.verify_org_access,
    category: "read",
    needsApproval: false,
  },
  list_integrations: {
    description:
      "List connected integration accounts (gmail, google-calendar, google-drive, linear, notion) for the current user.",
    input: toolInputSchemas.list_integrations,
    output: toolOutputSchemas.list_integrations,
    category: "read",
    needsApproval: false,
  },

  // ——— Mutating (needsApproval) ———
  create_deal: {
    description:
      "Create a new deal in the pipeline with optional company, contact, stage, value and expected close date.",
    input: toolInputSchemas.create_deal,
    output: toolOutputSchemas.create_deal,
    category: "mutate",
    needsApproval: true,
  },
  update_deal_stage: {
    description: "Move a deal to a new pipeline stage.",
    input: toolInputSchemas.update_deal_stage,
    output: toolOutputSchemas.update_deal_stage,
    category: "mutate",
    needsApproval: true,
  },
  create_customer: {
    description:
      "Create a new customer (company) with optional contact details.",
    input: toolInputSchemas.create_customer,
    output: toolOutputSchemas.create_customer,
    category: "mutate",
    needsApproval: true,
  },
  update_customer: {
    description: "Update mutable fields of an existing customer.",
    input: toolInputSchemas.update_customer,
    output: toolOutputSchemas.update_customer,
    category: "mutate",
    needsApproval: true,
  },
  send_proposal: {
    description:
      "Finalize a proposal draft and email it to the recipient through Gmail with a public link.",
    input: toolInputSchemas.send_proposal,
    output: toolOutputSchemas.send_proposal,
    category: "mutate",
    needsApproval: true,
    integration: "gmail",
  },
  send_invoice: {
    description:
      "Finalize an invoice draft and email it to the recipient through Gmail with a public link.",
    input: toolInputSchemas.send_invoice,
    output: toolOutputSchemas.send_invoice,
    category: "mutate",
    needsApproval: true,
    integration: "gmail",
  },
  gmail_send_email: {
    description:
      "Send a real email through the user's connected Gmail account. Approval required before dispatch.",
    input: toolInputSchemas.gmail_send_email,
    output: toolOutputSchemas.gmail_send_email,
    category: "mutate",
    needsApproval: true,
    integration: "gmail",
  },
  gmail_create_draft: {
    description:
      "Create a draft email in Gmail (requires gmail.compose scope; use gmail_send_email for sending with human approval under gmail.send).",
    input: toolInputSchemas.gmail_create_draft,
    output: toolOutputSchemas.gmail_create_draft,
    category: "mutate",
    needsApproval: false,
    integration: "gmail",
  },
  gcal_create_event: {
    description:
      "Create an event on the user's Google Calendar. Approval required before creating.",
    input: toolInputSchemas.gcal_create_event,
    output: toolOutputSchemas.gcal_create_event,
    category: "mutate",
    needsApproval: true,
    integration: "google-calendar",
  },
  gcal_cancel_event: {
    description: "Cancel (delete) an event on the user's Google Calendar.",
    input: toolInputSchemas.gcal_cancel_event,
    output: toolOutputSchemas.gcal_cancel_event,
    category: "mutate",
    needsApproval: true,
    integration: "google-calendar",
  },
  ask_clarifying_questions: {
    description:
      "Prompt the user with a structured questionnaire containing multiple choice, multi-select, text, or number questions when a request needs clarification, missing requirements, or project details.",
    input: toolInputSchemas.ask_clarifying_questions,
    output: toolOutputSchemas.ask_clarifying_questions,
    category: "read",
    needsApproval: false,
  },
} as const satisfies Record<string, ToolEntry>

export type ToolName = keyof typeof TOOL_CATALOG
export type ToolCategory = ToolEntry["category"]

export const TOOL_NAMES = Object.keys(TOOL_CATALOG) as ToolName[]

export function toolSpecs(): Array<{
  name: ToolName
  description: string
  inputSchema: z.ZodTypeAny
}> {
  return TOOL_NAMES.map((name) => ({
    name,
    description: TOOL_CATALOG[name].description,
    inputSchema: TOOL_CATALOG[name].input,
  }))
}
