import { toolDefinition } from "@tanstack/ai"
import {
  getInvoiceSummaryInput,
  getInvoiceSummaryOutput,
  getProposalSummaryInput,
  getProposalSummaryOutput,
  listInvoicesOutput,
  listProposalsOutput,
} from "@workspace/agent"
import type { AgentContext } from "../tool-ctx"
import {
  getInvoiceSummaryTool as implGetInvoiceSummary,
  getProposalSummaryTool as implGetProposalSummary,
  listInvoicesTool as implListInvoices,
  listProposalsTool as implListProposals,
} from "./documents-impl"

export function listProposalsTool(ctx: AgentContext) {
  return toolDefinition({
    name: "list_proposals",
    description:
      "List proposal drafts with status, revision, views, customer, value and acceptance state.",
    outputSchema: listProposalsOutput,
    needsApproval: false,
  }).server(async () => {
    return implListProposals({}, ctx)
  })
}

export function getProposalSummaryTool(ctx: AgentContext) {
  return toolDefinition({
    name: "get_proposal_summary",
    description:
      "Summary of one proposal draft (totals, customer and recipient emails) by id. Use before sending a proposal.",
    inputSchema: getProposalSummaryInput,
    outputSchema: getProposalSummaryOutput,
    needsApproval: false,
  }).server(async (args) => {
    return implGetProposalSummary(args, ctx)
  })
}

export function listInvoicesTool(ctx: AgentContext) {
  return toolDefinition({
    name: "list_invoices",
    description:
      "List invoice drafts with status, revision, views, customer, value, due date and invoice number.",
    outputSchema: listInvoicesOutput,
    needsApproval: false,
  }).server(async () => {
    return implListInvoices({}, ctx)
  })
}

export function getInvoiceSummaryTool(ctx: AgentContext) {
  return toolDefinition({
    name: "get_invoice_summary",
    description:
      "Summary of one invoice draft (totals, dates, customer and recipient emails) by id. Use before sending an invoice.",
    inputSchema: getInvoiceSummaryInput,
    outputSchema: getInvoiceSummaryOutput,
    needsApproval: false,
  }).server(async (args) => {
    return implGetInvoiceSummary(args, ctx)
  })
}
