import type { z } from "zod"
import { toolInputSchemas, toolOutputSchemas } from "./schemas"

export type ToolCapability =
  | "READ_ONLY"
  | "WORKSPACE_WRITE"
  | "EXTERNAL_DISPATCH"

export type ToolGroupId = "core" | "crm" | "documents" | "dispatch"

export interface ToolEntry {
  description: string
  input: z.ZodTypeAny
  output: z.ZodTypeAny
  category: "read" | "mutate"
  capability: ToolCapability
  group: ToolGroupId
  needsApproval: boolean
  integration?: "gmail" | "google-calendar"
}

/**
 * Single source of truth for the tool surface (04-§1/§2 in ideation/agent-chat).
 * Tool definitions are classified by group and capability to support dynamic
 * routing, reducing static prompt token overhead by up to 75%.
 */
export const TOOL_CATALOG = {
  // ——— Core discovery tools (always active) ———
  get_current_user_name: {
    description:
      "Get the display name of the currently signed-in user strictly without any PII (no email, phone, user id, or personal identifiers).",
    input: toolInputSchemas.get_current_user_name,
    output: toolOutputSchemas.get_current_user_name,
    category: "read" as const,
    capability: "READ_ONLY" as const,
    group: "core" as const,
    needsApproval: false,
  },
  verify_org_access: {
    description:
      "Verify organization context: returns the current organization id and name. Internal diagnostic tool; do not call for conversational queries or greetings.",
    input: toolInputSchemas.verify_org_access,
    output: toolOutputSchemas.verify_org_access,
    category: "read",
    capability: "READ_ONLY",
    group: "core",
    needsApproval: false,
  },
  ask_clarifying_questions: {
    description:
      "Prompt the user with a structured questionnaire containing multiple choice, multi-select, text, or number questions when a request needs clarification, missing requirements, or project details.",
    input: toolInputSchemas.ask_clarifying_questions,
    output: toolOutputSchemas.ask_clarifying_questions,
    category: "read",
    capability: "READ_ONLY",
    group: "core",
    needsApproval: false,
  },
  list_integrations: {
    description:
      "List connected integration accounts (gmail, google-calendar, google-drive, linear, notion) for the current user.",
    input: toolInputSchemas.list_integrations,
    output: toolOutputSchemas.list_integrations,
    category: "read",
    capability: "READ_ONLY",
    group: "core",
    needsApproval: false,
  },

  // ——— CRM & Pipeline tools ———
  list_deals: {
    description:
      "List all deals in the current organization's pipeline with stage, value and expected close date.",
    input: toolInputSchemas.list_deals,
    output: toolOutputSchemas.list_deals,
    category: "read",
    capability: "READ_ONLY",
    group: "crm",
    needsApproval: false,
  },
  deal_analytics: {
    description:
      "Pipeline analytics: total pipeline value, closed-won value, conversion rate, average deal size, deals closing this month, monthly pipeline trend and stage breakdown.",
    input: toolInputSchemas.deal_analytics,
    output: toolOutputSchemas.deal_analytics,
    category: "read",
    capability: "READ_ONLY",
    group: "crm",
    needsApproval: false,
  },
  list_customers: {
    description:
      "List customers (companies) with revenue and proposal counts in the current organization.",
    input: toolInputSchemas.list_customers,
    output: toolOutputSchemas.list_customers,
    category: "read",
    capability: "READ_ONLY",
    group: "crm",
    needsApproval: false,
  },
  customer_analytics: {
    description:
      "Customer analytics: total customers, top revenue client, most active client, inactive count, new customers this month.",
    input: toolInputSchemas.customer_analytics,
    output: toolOutputSchemas.customer_analytics,
    category: "read",
    capability: "READ_ONLY",
    group: "crm",
    needsApproval: false,
  },
  customer_details: {
    description:
      "Full customer profile: company fields, contacts, deals and proposals. Accepts a customer id.",
    input: toolInputSchemas.customer_details,
    output: toolOutputSchemas.customer_details,
    category: "read",
    capability: "READ_ONLY",
    group: "crm",
    needsApproval: false,
  },
  create_deal: {
    description:
      "Create a new deal in the pipeline with optional company, contact, stage, value and expected close date.",
    input: toolInputSchemas.create_deal,
    output: toolOutputSchemas.create_deal,
    category: "mutate",
    capability: "WORKSPACE_WRITE",
    group: "crm",
    needsApproval: true,
  },
  update_deal_stage: {
    description: "Move a deal to a new pipeline stage.",
    input: toolInputSchemas.update_deal_stage,
    output: toolOutputSchemas.update_deal_stage,
    category: "mutate",
    capability: "WORKSPACE_WRITE",
    group: "crm",
    needsApproval: true,
  },
  create_customer: {
    description:
      "Create a new customer (company) with optional contact details.",
    input: toolInputSchemas.create_customer,
    output: toolOutputSchemas.create_customer,
    category: "mutate",
    capability: "WORKSPACE_WRITE",
    group: "crm",
    needsApproval: true,
  },
  update_customer: {
    description: "Update mutable fields of an existing customer.",
    input: toolInputSchemas.update_customer,
    output: toolOutputSchemas.update_customer,
    category: "mutate",
    capability: "WORKSPACE_WRITE",
    group: "crm",
    needsApproval: true,
  },

  // ——— Document Authoring Studio ———
  list_proposals: {
    description:
      "List proposal drafts with status, revision, views, customer, value and acceptance state.",
    input: toolInputSchemas.list_proposals,
    output: toolOutputSchemas.list_proposals,
    category: "read",
    capability: "READ_ONLY",
    group: "documents",
    needsApproval: false,
  },
  list_invoices: {
    description:
      "List invoice drafts with status, revision, views, customer, value, due date and invoice number.",
    input: toolInputSchemas.list_invoices,
    output: toolOutputSchemas.list_invoices,
    category: "read",
    capability: "READ_ONLY",
    group: "documents",
    needsApproval: false,
  },
  get_proposal_summary: {
    description:
      "Summary of one proposal draft (totals, customer and recipient emails) by id. Use before sending a proposal.",
    input: toolInputSchemas.get_proposal_summary,
    output: toolOutputSchemas.get_proposal_summary,
    category: "read",
    capability: "READ_ONLY",
    group: "documents",
    needsApproval: false,
  },
  get_invoice_summary: {
    description:
      "Summary of one invoice draft (totals, dates, customer and recipient emails) by id. Use before sending an invoice.",
    input: toolInputSchemas.get_invoice_summary,
    output: toolOutputSchemas.get_invoice_summary,
    category: "read",
    capability: "READ_ONLY",
    group: "documents",
    needsApproval: false,
  },
  get_proposal: {
    description:
      "Fetch the complete structure, status, revision, block composition, and pricing breakdown of a proposal by ID.",
    input: toolInputSchemas.get_proposal,
    output: toolOutputSchemas.get_proposal,
    category: "read",
    capability: "READ_ONLY",
    group: "documents",
    needsApproval: false,
  },
  get_invoice: {
    description:
      "Fetch the complete structure, status, revision, line items, and payment details of an invoice by ID.",
    input: toolInputSchemas.get_invoice,
    output: toolOutputSchemas.get_invoice,
    category: "read",
    capability: "READ_ONLY",
    group: "documents",
    needsApproval: false,
  },
  create_proposal: {
    description:
      "Create a complete proposal draft with customer snapshots, structured pricing line items, and rich block composition (sections, timeline, metrics, team, testimonials, FAQ, signature). Returns draft ID, calculated totals, and visual editor link.",
    input: toolInputSchemas.create_proposal,
    output: toolOutputSchemas.create_proposal,
    category: "mutate",
    capability: "WORKSPACE_WRITE",
    group: "documents",
    needsApproval: false,
  },
  create_invoice: {
    description:
      "Create a complete invoice draft with customer snapshots, structured line items, due dates, payment terms, and integer minor pricing calculations. Returns invoice ID, totals, and visual editor link.",
    input: toolInputSchemas.create_invoice,
    output: toolOutputSchemas.create_invoice,
    category: "mutate",
    capability: "WORKSPACE_WRITE",
    group: "documents",
    needsApproval: false,
  },
  update_proposal: {
    description:
      "Atomically update a proposal's title, customer, pricing, or block composition with optimistic revision locking (expectedRevision).",
    input: toolInputSchemas.update_proposal,
    output: toolOutputSchemas.update_proposal,
    category: "mutate",
    capability: "WORKSPACE_WRITE",
    group: "documents",
    needsApproval: false,
  },
  update_invoice: {
    description:
      "Atomically update an invoice's title, due date, line items, payment terms, or customer details with optimistic revision locking (expectedRevision).",
    input: toolInputSchemas.update_invoice,
    output: toolOutputSchemas.update_invoice,
    category: "mutate",
    capability: "WORKSPACE_WRITE",
    group: "documents",
    needsApproval: false,
  },

  // ——— External Dispatch & Integrations ———
  schedule_document_send: {
    description:
      "Schedule a proposal or invoice to be sent automatically at a future timestamp via email with a branded Parliament review card and client gate button.",
    input: toolInputSchemas.schedule_document_send,
    output: toolOutputSchemas.schedule_document_send,
    category: "mutate",
    capability: "EXTERNAL_DISPATCH",
    group: "dispatch",
    needsApproval: true,
  },
  cancel_scheduled_dispatch: {
    description:
      "Cancel a pending scheduled document dispatch before it is sent.",
    input: toolInputSchemas.cancel_scheduled_dispatch,
    output: toolOutputSchemas.cancel_scheduled_dispatch,
    category: "mutate",
    capability: "EXTERNAL_DISPATCH",
    group: "dispatch",
    needsApproval: true,
  },
  list_scheduled_dispatches: {
    description:
      "List pending and completed scheduled document dispatches for the active organization or a specific document.",
    input: toolInputSchemas.list_scheduled_dispatches,
    output: toolOutputSchemas.list_scheduled_dispatches,
    category: "read",
    capability: "READ_ONLY",
    group: "dispatch",
    needsApproval: false,
  },
  send_proposal: {
    description:
      "Finalize a proposal draft and email a branded proposal review card to the client through Gmail with a secure 'View Proposal' button. The email template automatically includes document title, organization branding, and public review link. 'personalMessage' should be a brief professional client note (never dump internal URLs or markdown summaries).",
    input: toolInputSchemas.send_proposal,
    output: toolOutputSchemas.send_proposal,
    category: "mutate",
    capability: "EXTERNAL_DISPATCH",
    group: "dispatch",
    needsApproval: true,
    integration: "gmail",
  },
  send_invoice: {
    description:
      "Finalize an invoice draft and email a branded invoice card to the client through Gmail with a secure 'View Invoice' button. The email template automatically includes document title, organization branding, and payment link. 'personalMessage' should be a brief professional client note.",
    input: toolInputSchemas.send_invoice,
    output: toolOutputSchemas.send_invoice,
    category: "mutate",
    capability: "EXTERNAL_DISPATCH",
    group: "dispatch",
    needsApproval: true,
    integration: "gmail",
  },
  gmail_send_email: {
    description:
      "Send a formatted email through the user's connected Gmail account. Converts markdown or HTML to clean email typography. Approval required before dispatch.",
    input: toolInputSchemas.gmail_send_email,
    output: toolOutputSchemas.gmail_send_email,
    category: "mutate",
    capability: "EXTERNAL_DISPATCH",
    group: "dispatch",
    needsApproval: true,
    integration: "gmail",
  },
  gmail_create_draft: {
    description:
      "Create a draft email in Gmail (requires gmail.compose scope; use gmail_send_email for sending with human approval under gmail.send).",
    input: toolInputSchemas.gmail_create_draft,
    output: toolOutputSchemas.gmail_create_draft,
    category: "mutate",
    capability: "EXTERNAL_DISPATCH",
    group: "dispatch",
    needsApproval: false,
    integration: "gmail",
  },
  gcal_list_events: {
    description:
      "List upcoming events on the user's Google Calendar (default: next 7 days, up to 14).",
    input: toolInputSchemas.gcal_list_events,
    output: toolOutputSchemas.gcal_list_events,
    category: "read",
    capability: "READ_ONLY",
    group: "dispatch",
    needsApproval: false,
    integration: "google-calendar",
  },
  gcal_create_event: {
    description:
      "Create an event on the user's Google Calendar. Approval required before creating.",
    input: toolInputSchemas.gcal_create_event,
    output: toolOutputSchemas.gcal_create_event,
    category: "mutate",
    capability: "EXTERNAL_DISPATCH",
    group: "dispatch",
    needsApproval: true,
    integration: "google-calendar",
  },
  gcal_cancel_event: {
    description: "Cancel (delete) an event on the user's Google Calendar.",
    input: toolInputSchemas.gcal_cancel_event,
    output: toolOutputSchemas.gcal_cancel_event,
    category: "mutate",
    capability: "EXTERNAL_DISPATCH",
    group: "dispatch",
    needsApproval: true,
    integration: "google-calendar",
  },
} as const satisfies Record<string, ToolEntry>

export type ToolName = keyof typeof TOOL_CATALOG
export type ToolCategory = ToolEntry["category"]

export const TOOL_NAMES = Object.keys(TOOL_CATALOG) as ToolName[]

export const TOOL_GROUPS: Record<ToolGroupId, ToolName[]> = {
  core: [
    "get_current_user_name",
    "verify_org_access",
    "ask_clarifying_questions",
    "list_integrations",
  ],
  crm: [
    "list_deals",
    "deal_analytics",
    "list_customers",
    "customer_analytics",
    "customer_details",
    "create_deal",
    "update_deal_stage",
    "create_customer",
    "update_customer",
  ],
  documents: [
    "list_proposals",
    "list_invoices",
    "get_proposal_summary",
    "get_invoice_summary",
    "get_proposal",
    "get_invoice",
    "create_proposal",
    "create_invoice",
    "update_proposal",
    "update_invoice",
  ],
  dispatch: [
    "schedule_document_send",
    "cancel_scheduled_dispatch",
    "list_scheduled_dispatches",
    "send_proposal",
    "send_invoice",
    "gmail_send_email",
    "gmail_create_draft",
    "gcal_list_events",
    "gcal_create_event",
    "gcal_cancel_event",
  ],
}

export function getToolsForGroups(groups: ToolGroupId[]): ToolName[] {
  const set = new Set<ToolName>()
  for (const group of groups) {
    for (const tool of TOOL_GROUPS[group] ?? []) {
      set.add(tool)
    }
  }
  return Array.from(set)
}

export function toolSpecs(toolNames: ToolName[] = TOOL_NAMES): Array<{
  name: ToolName
  description: string
  inputSchema: z.ZodTypeAny
}> {
  return toolNames.map((name) => ({
    name,
    description: TOOL_CATALOG[name].description,
    inputSchema: TOOL_CATALOG[name].input,
  }))
}
