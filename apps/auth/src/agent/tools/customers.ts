import { toolDefinition } from "@tanstack/ai"
import {
  createCustomerInput,
  customerAnalyticsOutput,
  customerDetailsInput,
  customerDetailsOutput,
  listCustomersOutput,
  toolOutputSchemas,
  updateCustomerInput,
} from "@workspace/agent"
import { and, db, eq, schema, sql } from "@workspace/database"
import { logWideEvent } from "@workspace/logger"
import type { AgentContext } from "../tool-ctx"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
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

/**
 * `create_customer`: org-scoped customer creation mirroring
 * `apps/command/src/server/customers.ts` `createCustomerServerFn`. Approval-gated.
 */
export function createCustomerTool(ctx: AgentContext) {
  return toolDefinition({
    name: "create_customer",
    description:
      "Create a new customer (company) with optional contact details. Approval required.",
    inputSchema: createCustomerInput,
    outputSchema: toolOutputSchemas.create_customer,
    needsApproval: true,
  }).server(async (args) => {
    const id = crypto.randomUUID()
    const [newCustomer] = await db
      .insert(schema.company)
      .values({
        id,
        organizationId: ctx.organizationId,
        name: args.name,
        billingEmail: args.billingEmail || null,
        phone: args.phone || null,
        website: args.website || null,
        vatNumber: args.vatNumber || null,
        city: args.city || null,
        country: args.country || null,
        note: args.note || null,
        status: args.status ?? "active",
        preferredCurrency: args.preferredCurrency ?? "USD",
        industry: args.industry || null,
      })
      .returning()

    if (!newCustomer) {
      throw new Error("Failed to save client entity")
    }

    logWideEvent({
      event: "agent.customer.created",
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityId: id,
      outcome: "success",
      metadata: {
        status: args.status,
        currency: args.preferredCurrency,
      },
    })

    return newCustomer
  })
}

/**
 * `update_customer`: update mutable fields of an existing customer, mirroring
 * `apps/command/src/server/customers.ts` `updateCustomerServerFn`. Approval-gated.
 */
export function updateCustomerTool(ctx: AgentContext) {
  return toolDefinition({
    name: "update_customer",
    description:
      "Update mutable fields of an existing customer. Approval required.",
    inputSchema: updateCustomerInput,
    outputSchema: toolOutputSchemas.update_customer,
    needsApproval: true,
  }).server(async (args) => {
    let customerId = args.id
    const isUuid = typeof args.id === "string" && UUID_REGEX.test(args.id)

    if (!isUuid && args.id) {
      const [found] = await db
        .select({ id: schema.company.id })
        .from(schema.company)
        .where(
          and(
            eq(schema.company.organizationId, ctx.organizationId),
            sql`lower(${schema.company.name}) LIKE lower(${`%${args.id}%`})`
          )
        )
        .limit(1)
      if (found) {
        customerId = found.id
      } else {
        throw new Error(`Customer "${args.id}" not found or unauthorized`)
      }
    }

    const [updatedCustomer] = await db
      .update(schema.company)
      .set({
        ...(args.name !== undefined && { name: args.name }),
        ...(args.billingEmail !== undefined && {
          billingEmail: args.billingEmail || null,
        }),
        ...(args.phone !== undefined && { phone: args.phone || null }),
        ...(args.website !== undefined && { website: args.website || null }),
        ...(args.vatNumber !== undefined && {
          vatNumber: args.vatNumber || null,
        }),
        ...(args.city !== undefined && { city: args.city || null }),
        ...(args.country !== undefined && { country: args.country || null }),
        ...(args.note !== undefined && { note: args.note || null }),
        ...(args.status !== undefined && { status: args.status }),
        ...(args.preferredCurrency !== undefined && {
          preferredCurrency: args.preferredCurrency,
        }),
        ...(args.industry !== undefined && { industry: args.industry || null }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.company.id, customerId),
          eq(schema.company.organizationId, ctx.organizationId)
        )
      )
      .returning()

    if (!updatedCustomer) {
      throw new Error(`Customer "${args.id}" not found or unauthorized`)
    }

    logWideEvent({
      event: "agent.customer.updated",
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityId: customerId,
      outcome: "success",
      metadata: {
        status: args.status,
        currency: args.preferredCurrency,
      },
    })

    return updatedCustomer
  })
}
