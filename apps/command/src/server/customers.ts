import { randomUUID } from "node:crypto"
import { createServerFn } from "@tanstack/react-start"
import { and, count, db, desc, eq, gte, schema, sql } from "@workspace/database"
import {
  createCustomerInputSchema,
  updateCustomerInputSchema,
} from "@workspace/document/schema"
import { logWideEvent } from "@workspace/logger"
import { z } from "zod"
import { getErrorMessage } from "../lib/error-formatter"
import { requireActiveOrganization, requireAuth } from "./auth"

const customerIdSchema = z.object({ id: z.string().uuid() })

export const listCustomersServerFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    try {
      const organizationId = await requireActiveOrganization(context.auth)

      const rows = await db
        .select({
          id: schema.company.id,
          organizationId: schema.company.organizationId,
          name: schema.company.name,
          billingEmail: schema.company.billingEmail,
          phone: schema.company.phone,
          website: schema.company.website,
          domain: schema.company.domain,
          vatNumber: schema.company.vatNumber,
          addressLine1: schema.company.addressLine1,
          city: schema.company.city,
          country: schema.company.country,
          note: schema.company.note,
          status: schema.company.status,
          preferredCurrency: schema.company.preferredCurrency,
          defaultPaymentTerms: schema.company.defaultPaymentTerms,
          industry: schema.company.industry,
          isArchived: schema.company.isArchived,
          createdAt: schema.company.createdAt,
          updatedAt: schema.company.updatedAt,
          proposalsCount: count(schema.proposal.id),
          totalRevenueMinorUnits: sql<number>`coalesce(sum(${schema.proposal.totalMinorUnits}), 0)::int`,
        })
        .from(schema.company)
        .leftJoin(
          schema.proposal,
          eq(schema.proposal.companyId, schema.company.id)
        )
        .where(eq(schema.company.organizationId, organizationId))
        .groupBy(schema.company.id)
        .orderBy(desc(schema.company.updatedAt))

      return rows
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load client directory"))
    }
  })

export const getCustomerDetailsServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(customerIdSchema)
  .handler(async ({ context, data }) => {
    try {
      const organizationId = await requireActiveOrganization(context.auth)

      const [customerRow] = await db
        .select()
        .from(schema.company)
        .where(
          and(
            eq(schema.company.id, data.id),
            eq(schema.company.organizationId, organizationId)
          )
        )
        .limit(1)

      if (!customerRow) {
        throw new Error("Client not found")
      }

      const contacts = await db
        .select()
        .from(schema.contact)
        .where(
          and(
            eq(schema.contact.companyId, data.id),
            eq(schema.contact.organizationId, organizationId)
          )
        )
        .orderBy(desc(schema.contact.createdAt))

      const deals = await db
        .select()
        .from(schema.deal)
        .where(
          and(
            eq(schema.deal.companyId, data.id),
            eq(schema.deal.organizationId, organizationId)
          )
        )
        .orderBy(desc(schema.deal.updatedAt))

      const proposals = await db
        .select({
          id: schema.proposal.id,
          title: schema.proposal.title,
          status: schema.proposal.status,
          totalMinorUnits: schema.proposal.totalMinorUnits,
          currency: schema.proposal.currency,
          createdAt: schema.proposal.createdAt,
        })
        .from(schema.proposal)
        .where(
          and(
            eq(schema.proposal.companyId, data.id),
            eq(schema.proposal.organizationId, organizationId)
          )
        )
        .orderBy(desc(schema.proposal.createdAt))

      return {
        customer: customerRow,
        contacts,
        deals,
        proposals,
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load client details"))
    }
  })

export const getCustomerAnalyticsServerFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    try {
      const organizationId = await requireActiveOrganization(context.auth)
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Total customers count
      const [countResult] = await db
        .select({ total: count(schema.company.id) })
        .from(schema.company)
        .where(eq(schema.company.organizationId, organizationId))

      // Top Revenue Client
      const [topRevenueRow] = await db
        .select({
          name: schema.company.name,
          revenueMinorUnits: sql<number>`coalesce(sum(${schema.proposal.totalMinorUnits}), 0)::int`,
        })
        .from(schema.company)
        .innerJoin(
          schema.proposal,
          eq(schema.proposal.companyId, schema.company.id)
        )
        .where(eq(schema.company.organizationId, organizationId))
        .groupBy(schema.company.id, schema.company.name)
        .orderBy(sql`sum(${schema.proposal.totalMinorUnits}) DESC`)
        .limit(1)

      // Most Active Client (by proposals)
      const [mostActiveRow] = await db
        .select({
          name: schema.company.name,
          proposalsCount: count(schema.proposal.id),
        })
        .from(schema.company)
        .innerJoin(
          schema.proposal,
          eq(schema.proposal.companyId, schema.company.id)
        )
        .where(eq(schema.company.organizationId, organizationId))
        .groupBy(schema.company.id, schema.company.name)
        .orderBy(sql`count(${schema.proposal.id}) DESC`)
        .limit(1)

      // Inactive Clients Count
      const [inactiveRow] = await db
        .select({ total: count(schema.company.id) })
        .from(schema.company)
        .where(
          and(
            eq(schema.company.organizationId, organizationId),
            eq(schema.company.status, "inactive")
          )
        )

      // New Customers This Month
      const [newThisMonthRow] = await db
        .select({ total: count(schema.company.id) })
        .from(schema.company)
        .where(
          and(
            eq(schema.company.organizationId, organizationId),
            gte(schema.company.createdAt, firstDayOfMonth)
          )
        )

      return {
        totalCustomersCount: countResult?.total || 0,
        topRevenueClient: topRevenueRow
          ? {
              name: topRevenueRow.name,
              revenueMinorUnits: topRevenueRow.revenueMinorUnits,
            }
          : null,
        mostActiveClient: mostActiveRow
          ? {
              name: mostActiveRow.name,
              proposalsCount: mostActiveRow.proposalsCount,
            }
          : null,
        inactiveClientsCount: inactiveRow?.total || 0,
        newCustomersThisMonth: newThisMonthRow?.total || 0,
      }
    } catch (error) {
      throw new Error(
        getErrorMessage(error, "Failed to calculate client analytics")
      )
    }
  })

export const createCustomerServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(createCustomerInputSchema)
  .handler(async ({ context, data }) => {
    const startTime = Date.now()
    let organizationId = ""
    let userId: string | undefined

    try {
      organizationId = await requireActiveOrganization(context.auth)
      userId =
        typeof context.auth.user?.id === "string"
          ? context.auth.user.id
          : undefined
      const id = randomUUID()

      const [newCustomer] = await db
        .insert(schema.company)
        .values({
          id,
          organizationId,
          name: data.name,
          billingEmail: data.billingEmail || null,
          phone: data.phone || null,
          website: data.website || null,
          vatNumber: data.vatNumber || null,
          addressLine1: data.addressLine1 || null,
          city: data.city || null,
          country: data.country || null,
          note: data.note || null,
          status: data.status,
          preferredCurrency: data.preferredCurrency,
          defaultPaymentTerms: data.defaultPaymentTerms,
          industry: data.industry || null,
        })
        .returning()

      if (!newCustomer) {
        throw new Error("Failed to save client entity")
      }

      logWideEvent({
        event: "client.customer.created",
        durationMs: Date.now() - startTime,
        organizationId,
        userId,
        entityId: id,
        outcome: "success",
        metadata: {
          status: data.status,
          currency: data.preferredCurrency,
        },
      })

      return newCustomer
    } catch (error) {
      logWideEvent({
        event: "client.customer.created",
        durationMs: Date.now() - startTime,
        organizationId: organizationId || "unauthenticated",
        userId,
        outcome: "failure",
        metadata: {
          error: getErrorMessage(error),
        },
      })
      throw new Error(getErrorMessage(error, "Failed to create client"))
    }
  })

export const updateCustomerServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(updateCustomerInputSchema)
  .handler(async ({ context, data }) => {
    const startTime = Date.now()
    let organizationId = ""
    let userId: string | undefined

    try {
      organizationId = await requireActiveOrganization(context.auth)
      userId =
        typeof context.auth.user?.id === "string"
          ? context.auth.user.id
          : undefined

      const [updatedCustomer] = await db
        .update(schema.company)
        .set({
          ...(data.name && { name: data.name }),
          ...(data.billingEmail !== undefined && {
            billingEmail: data.billingEmail || null,
          }),
          ...(data.phone !== undefined && { phone: data.phone || null }),
          ...(data.website !== undefined && { website: data.website || null }),
          ...(data.vatNumber !== undefined && {
            vatNumber: data.vatNumber || null,
          }),
          ...(data.addressLine1 !== undefined && {
            addressLine1: data.addressLine1 || null,
          }),
          ...(data.city !== undefined && { city: data.city || null }),
          ...(data.country !== undefined && { country: data.country || null }),
          ...(data.note !== undefined && { note: data.note || null }),
          ...(data.status && { status: data.status }),
          ...(data.preferredCurrency && {
            preferredCurrency: data.preferredCurrency,
          }),
          ...(data.defaultPaymentTerms && {
            defaultPaymentTerms: data.defaultPaymentTerms,
          }),
          ...(data.industry !== undefined && {
            industry: data.industry || null,
          }),
          ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.company.id, data.id),
            eq(schema.company.organizationId, organizationId)
          )
        )
        .returning()

      if (!updatedCustomer) {
        throw new Error("Client not found or unauthorized")
      }

      logWideEvent({
        event: "client.customer.updated",
        durationMs: Date.now() - startTime,
        organizationId,
        userId,
        entityId: data.id,
        outcome: "success",
        metadata: {
          updatedFields: Object.keys(data),
        },
      })

      return updatedCustomer
    } catch (error) {
      logWideEvent({
        event: "client.customer.updated",
        durationMs: Date.now() - startTime,
        organizationId: organizationId || "unauthenticated",
        userId,
        entityId: data.id,
        outcome: "failure",
        metadata: {
          error: getErrorMessage(error),
        },
      })
      throw new Error(getErrorMessage(error, "Failed to update client"))
    }
  })
