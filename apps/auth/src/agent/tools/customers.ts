import { toolDefinition } from "@tanstack/ai"
import {
  customerAnalyticsOutput,
  customerDetailsInput,
  customerDetailsOutput,
  listCustomersOutput,
} from "@workspace/agent"
import type { AgentContext } from "../tool-ctx"
import {
  customerAnalyticsTool as implCustomerAnalytics,
  customerDetailsTool as implCustomerDetails,
  listCustomersTool as implListCustomers,
} from "./customers-impl"

export function listCustomersTool(ctx: AgentContext) {
  return toolDefinition({
    name: "list_customers",
    description:
      "List customers (companies) with revenue and proposal counts in the current organization.",
    outputSchema: listCustomersOutput,
    needsApproval: false,
  }).server(async () => {
    return implListCustomers({}, ctx)
  })
}

export function customerAnalyticsTool(ctx: AgentContext) {
  return toolDefinition({
    name: "customer_analytics",
    description:
      "Customer analytics: total customers, top revenue client, most active client, inactive count, new customers this month.",
    outputSchema: customerAnalyticsOutput,
    needsApproval: false,
  }).server(async () => {
    return implCustomerAnalytics({}, ctx)
  })
}

export function customerDetailsTool(ctx: AgentContext) {
  return toolDefinition({
    name: "customer_details",
    description:
      "Full customer profile: company fields, contacts, deals and proposals. Accepts a customer id.",
    inputSchema: customerDetailsInput,
    outputSchema: customerDetailsOutput,
    needsApproval: false,
  }).server(async (args) => {
    return implCustomerDetails(args, ctx)
  })
}
