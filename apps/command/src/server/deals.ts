import { randomUUID } from "node:crypto"
import { createServerFn } from "@tanstack/react-start"
import {
  and,
  db,
  desc,
  eq,
  schema,
} from "@workspace/database"
import { createProposalDraftFromBlueprint } from "@workspace/document/proposal"
import {
  createDealInputSchema,
  updateDealStageInputSchema,
} from "@workspace/document/schema"
import { logWideEvent } from "@workspace/logger"
import { z } from "zod"
import { getErrorMessage } from "../lib/error-formatter"
import { requireActiveOrganization, requireAuth } from "./auth"

const dealIdSchema = z.object({ id: z.string().uuid() })

export const listDealsServerFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    try {
      const organizationId = await requireActiveOrganization(context.auth)
      const rows = await db
        .select({
          id: schema.deal.id,
          organizationId: schema.deal.organizationId,
          companyId: schema.deal.companyId,
          contactId: schema.deal.contactId,
          proposalId: schema.deal.proposalId,
          title: schema.deal.title,
          stage: schema.deal.stage,
          valueMinorUnits: schema.deal.valueMinorUnits,
          currency: schema.deal.currency,
          expectedCloseDate: schema.deal.expectedCloseDate,
          createdAt: schema.deal.createdAt,
          updatedAt: schema.deal.updatedAt,
          companyName: schema.company.name,
          contactEmail: schema.contact.email,
        })
        .from(schema.deal)
        .leftJoin(schema.company, eq(schema.company.id, schema.deal.companyId))
        .leftJoin(schema.contact, eq(schema.contact.id, schema.deal.contactId))
        .where(eq(schema.deal.organizationId, organizationId))
        .orderBy(desc(schema.deal.updatedAt))

      return rows
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load deals list"))
    }
  })

export const getDealAnalyticsServerFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    try {
      const organizationId = await requireActiveOrganization(context.auth)

      const deals = await db
        .select({
          id: schema.deal.id,
          stage: schema.deal.stage,
          valueMinorUnits: schema.deal.valueMinorUnits,
          expectedCloseDate: schema.deal.expectedCloseDate,
          createdAt: schema.deal.createdAt,
        })
        .from(schema.deal)
        .where(eq(schema.deal.organizationId, organizationId))

      const now = new Date()
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Active & Total metrics
      const activeDeals = deals.filter((d) => d.stage !== "closed_lost")
      const totalPipelineValue = activeDeals.reduce((sum, d) => sum + (d.valueMinorUnits || 0), 0)
      const wonDeals = deals.filter((d) => d.stage === "closed_won")
      const closedWonValue = wonDeals.reduce((sum, d) => sum + (d.valueMinorUnits || 0), 0)
      const totalDecided = wonDeals.length + deals.filter((d) => d.stage === "closed_lost").length
      const conversionRate = totalDecided > 0 ? Math.round((wonDeals.length / totalDecided) * 1000) / 10 : 0
      const avgDealSize = deals.length > 0 ? Math.round(totalPipelineValue / deals.length) : 0
      const dealsToCloseThisMonth = deals.filter(
        (d) => d.expectedCloseDate && d.expectedCloseDate.startsWith(currentYearMonth)
      ).length

      // Previous period metrics
      const prevDeals = deals.filter((d) => new Date(d.createdAt) < thirtyDaysAgo)
      const prevActiveDeals = prevDeals.filter((d) => d.stage !== "closed_lost")
      const previousPipelineValue = prevActiveDeals.reduce((sum, d) => sum + (d.valueMinorUnits || 0), 0)
      const prevWonDeals = prevDeals.filter((d) => d.stage === "closed_won")
      const prevTotalDecided = prevWonDeals.length + prevDeals.filter((d) => d.stage === "closed_lost").length
      const previousConversionRate = prevTotalDecided > 0 ? Math.round((prevWonDeals.length / prevTotalDecided) * 1000) / 10 : 0

      // Monthly pipeline (last 12 months)
      const monthsMap = new Map<string, { value: number; count: number; monthName: string }>()
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        const monthName = d.toLocaleString("en-US", { month: "short" }).toUpperCase()
        monthsMap.set(key, { value: 0, count: 0, monthName })
      }

      for (const dealItem of deals) {
        const createdAtDate = new Date(dealItem.createdAt)
        const key = `${createdAtDate.getFullYear()}-${String(createdAtDate.getMonth() + 1).padStart(2, "0")}`
        if (monthsMap.has(key)) {
          const item = monthsMap.get(key)!
          item.value += dealItem.valueMinorUnits || 0
          item.count += 1
        }
      }

      const monthlyPipeline = Array.from(monthsMap.entries()).map(([key, data]) => ({
        monthKey: key,
        month: data.monthName,
        value: data.value,
        count: data.count,
        isCurrent: key === currentYearMonth,
      }))

      // Stage breakdown
      const stagesList = ["lead", "discovery", "proposal_sent", "negotiation", "closed_won", "closed_lost"] as const
      const stageBreakdown = stagesList.map((stg) => {
        const stageDeals = deals.filter((d) => d.stage === stg)
        const value = stageDeals.reduce((sum, d) => sum + (d.valueMinorUnits || 0), 0)
        return {
          stage: stg,
          count: stageDeals.length,
          value,
        }
      })

      return {
        totalPipelineValue,
        closedWonValue,
        conversionRate,
        avgDealSize,
        dealsToCloseThisMonth,
        previousPipelineValue,
        previousConversionRate,
        monthlyPipeline,
        stageBreakdown,
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to compute deal analytics"))
    }
  })

export const createDealServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(createDealInputSchema)
  .handler(async ({ context, data }) => {
    const startTime = Date.now()
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = context.auth.user?.id
    const id = randomUUID()

    try {
      const [newDeal] = await db
        .insert(schema.deal)
        .values({
          id,
          organizationId,
          companyId: data.companyId ?? null,
          contactId: data.contactId ?? null,
          title: data.title,
          stage: data.stage,
          valueMinorUnits: data.valueMinorUnits,
          currency: data.currency,
          expectedCloseDate: data.expectedCloseDate ?? null,
          createdById: userId ?? null,
        })
        .returning()

      if (!newDeal) {
        throw new Error("Failed to create deal")
      }

      logWideEvent({
        event: "client.deal.created",
        durationMs: Date.now() - startTime,
        organizationId,
        userId: userId ?? undefined,
        entityId: id,
        outcome: "success",
        metadata: {
          stage: data.stage,
          valueMinorUnits: data.valueMinorUnits,
          currency: data.currency,
        },
      })

      return newDeal
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to create deal"))
    }
  })

export const updateDealStageServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(updateDealStageInputSchema)
  .handler(async ({ context, data }) => {
    const startTime = Date.now()
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = context.auth.user?.id

    try {
      const [updatedDeal] = await db
        .update(schema.deal)
        .set({
          stage: data.stage,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.deal.id, data.id),
            eq(schema.deal.organizationId, organizationId)
          )
        )
        .returning()

      if (!updatedDeal) {
        throw new Error("Deal not found or unauthorized")
      }

      logWideEvent({
        event: "client.deal.stage_updated",
        durationMs: Date.now() - startTime,
        organizationId,
        userId: userId ?? undefined,
        entityId: data.id,
        outcome: "success",
        metadata: {
          newStage: data.stage,
        },
      })

      return updatedDeal
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to update deal stage"))
    }
  })

export const convertDealToProposalServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(dealIdSchema)
  .handler(async ({ context, data }) => {
    const startTime = Date.now()
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = context.auth.user?.id

    try {
      // 1. Fetch deal with optional company and contact details
      const [dealRow] = await db
        .select({
          id: schema.deal.id,
          title: schema.deal.title,
          valueMinorUnits: schema.deal.valueMinorUnits,
          currency: schema.deal.currency,
          companyId: schema.deal.companyId,
          contactId: schema.deal.contactId,
          companyName: schema.company.name,
          contactEmail: schema.contact.email,
          contactFirstName: schema.contact.firstName,
          contactLastName: schema.contact.lastName,
        })
        .from(schema.deal)
        .leftJoin(schema.company, eq(schema.company.id, schema.deal.companyId))
        .leftJoin(schema.contact, eq(schema.contact.id, schema.deal.contactId))
        .where(
          and(
            eq(schema.deal.id, data.id),
            eq(schema.deal.organizationId, organizationId)
          )
        )
        .limit(1)

      if (!dealRow) {
        throw new Error("Deal not found")
      }

      const proposalId = randomUUID()
      const sellerName =
        typeof context.auth.user.name === "string" ? context.auth.user.name : ""

      const draftDoc = createProposalDraftFromBlueprint({
        id: proposalId,
        blueprint: "classic",
        sellerName,
      })

      // Pre-populate customer metadata from linked account / contact
      if (dealRow.companyName) {
        draftDoc.data.customer.name = dealRow.companyName
      }
      if (dealRow.contactEmail) {
        draftDoc.data.customer.email = dealRow.contactEmail
      }
      if (dealRow.title) {
        draftDoc.data.title = `Proposal for ${dealRow.title}`
      }

      const result = await db.transaction(async (tx) => {
        // Create baseline proposal row
        const [newProposal] = await tx
          .insert(schema.proposal)
          .values({
            id: proposalId,
            organizationId,
            companyId: dealRow.companyId,
            contactId: dealRow.contactId,
            title: draftDoc.data.title,
            status: "draft",
            currency: dealRow.currency,
            subtotalMinorUnits: dealRow.valueMinorUnits,
            totalMinorUnits: dealRow.valueMinorUnits,
            createdById: userId ?? null,
          })
          .returning()

        // Insert version 1 snapshot
        await tx.insert(schema.proposalVersion).values({
          proposalId,
          organizationId,
          versionNumber: 1,
          content: draftDoc.composition.blocks,
          proposalDraft: draftDoc,
          hash: "initial-deal-conversion",
          createdById: userId ?? null,
        })

        // Insert legacy draft row for editor backwards compatibility
        await tx.insert(schema.proposalDraft).values({
          id: proposalId,
          organizationId,
          createdByUserId: userId ?? null,
          title: draftDoc.data.title,
          status: "draft",
          document: draftDoc,
          revision: 1,
        })

        // Link proposal to deal and advance stage to proposal_sent
        await tx
          .update(schema.deal)
          .set({
            proposalId,
            stage: "proposal_sent",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.deal.id, data.id),
              eq(schema.deal.organizationId, organizationId)
            )
          )

        return newProposal
      })

      logWideEvent({
        event: "client.deal.proposal_created",
        durationMs: Date.now() - startTime,
        organizationId,
        userId: userId ?? undefined,
        entityId: data.id,
        outcome: "success",
        metadata: {
          proposalId,
          newStage: "proposal_sent",
        },
      })

      return { proposalId, proposal: result }
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to convert deal to proposal"))
    }
  })
