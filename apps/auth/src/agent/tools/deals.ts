import { toolDefinition } from "@tanstack/ai"
import {
  createDealInput,
  dealAnalyticsOutput,
  listDealsOutput,
  toolOutputSchemas,
  updateDealStageInput,
} from "@workspace/agent"
import { and, db, desc, eq, schema } from "@workspace/database"
import { logWideEvent } from "@workspace/logger"
import type { AgentContext } from "../tool-ctx"

const STAGES = [
  "lead",
  "discovery",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const

/**
 * `list_deals` (04-§2.1): org-scoped deals list mirroring
 * `apps/command/src/server/deals.ts` `listDealsServerFn`. Read-only, auto-run.
 */
export function listDealsTool(ctx: AgentContext) {
  return toolDefinition({
    name: "list_deals",
    description:
      "List deals in the current organization's pipeline, newest first. Returns id, title, company name, contact email, stage, value (integer minor units), currency, and expected close date.",
    outputSchema: listDealsOutput,
    needsApproval: false,
  }).server(async () => {
    const rows = await db
      .select({
        id: schema.deal.id,
        title: schema.deal.title,
        companyName: schema.company.name,
        contactEmail: schema.contact.email,
        stage: schema.deal.stage,
        valueMinorUnits: schema.deal.valueMinorUnits,
        currency: schema.deal.currency,
        expectedCloseDate: schema.deal.expectedCloseDate,
      })
      .from(schema.deal)
      .leftJoin(schema.company, eq(schema.company.id, schema.deal.companyId))
      .leftJoin(schema.contact, eq(schema.contact.id, schema.deal.contactId))
      .where(eq(schema.deal.organizationId, ctx.organizationId))
      .orderBy(desc(schema.deal.updatedAt))
    return { rows }
  })
}

/**
 * `deal_analytics` (04-§2.1): pipeline analytics mirroring
 * `getDealAnalyticsServerFn`. Read-only, auto-run.
 */
export function dealAnalyticsTool(ctx: AgentContext) {
  return toolDefinition({
    name: "deal_analytics",
    description:
      "Pipeline analytics for the current organization: total pipeline value, closed-won value, conversion rate, average deal size, deals closing this month, prior-period comparison, last-12-months monthly pipeline, and stage breakdown. Values in integer minor units.",
    outputSchema: dealAnalyticsOutput,
    needsApproval: false,
  }).server(async () => {
    const deals = await db
      .select({
        id: schema.deal.id,
        stage: schema.deal.stage,
        valueMinorUnits: schema.deal.valueMinorUnits,
        expectedCloseDate: schema.deal.expectedCloseDate,
        createdAt: schema.deal.createdAt,
      })
      .from(schema.deal)
      .where(eq(schema.deal.organizationId, ctx.organizationId))

    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const activeDeals = deals.filter((d) => d.stage !== "closed_lost")
    const totalPipelineValue = activeDeals.reduce(
      (sum, d) => sum + (d.valueMinorUnits || 0),
      0
    )
    const wonDeals = deals.filter((d) => d.stage === "closed_won")
    const closedWonValue = wonDeals.reduce(
      (sum, d) => sum + (d.valueMinorUnits || 0),
      0
    )
    const totalDecided =
      wonDeals.length + deals.filter((d) => d.stage === "closed_lost").length
    const conversionRate =
      totalDecided > 0
        ? Math.round((wonDeals.length / totalDecided) * 1000) / 10
        : 0
    const avgDealSize =
      deals.length > 0 ? Math.round(totalPipelineValue / deals.length) : 0
    const dealsToCloseThisMonth = deals.filter(
      (d) =>
        d.expectedCloseDate && d.expectedCloseDate.startsWith(currentYearMonth)
    ).length

    const prevDeals = deals.filter((d) => new Date(d.createdAt) < thirtyDaysAgo)
    const prevActiveDeals = prevDeals.filter((d) => d.stage !== "closed_lost")
    const previousPipelineValue = prevActiveDeals.reduce(
      (sum, d) => sum + (d.valueMinorUnits || 0),
      0
    )
    const prevWonDeals = prevDeals.filter((d) => d.stage === "closed_won")
    const prevTotalDecided =
      prevWonDeals.length +
      prevDeals.filter((d) => d.stage === "closed_lost").length
    const previousConversionRate =
      prevTotalDecided > 0
        ? Math.round((prevWonDeals.length / prevTotalDecided) * 1000) / 10
        : 0

    const monthsMap = new Map<
      string,
      { value: number; count: number; monthName: string }
    >()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const monthName = d
        .toLocaleString("en-US", { month: "short" })
        .toUpperCase()
      monthsMap.set(key, { value: 0, count: 0, monthName })
    }

    for (const dealItem of deals) {
      const createdAtDate = new Date(dealItem.createdAt)
      const key = `${createdAtDate.getFullYear()}-${String(createdAtDate.getMonth() + 1).padStart(2, "0")}`
      const item = monthsMap.get(key)
      if (item) {
        item.value += dealItem.valueMinorUnits || 0
        item.count += 1
      }
    }

    const monthlyPipeline = Array.from(monthsMap.entries()).map(
      ([key, data]) => ({
        monthKey: key,
        month: data.monthName,
        value: data.value,
        count: data.count,
        isCurrent: key === currentYearMonth,
      })
    )

    const stageBreakdown = STAGES.map((stg) => {
      const stageDeals = deals.filter((d) => d.stage === stg)
      const value = stageDeals.reduce(
        (sum, d) => sum + (d.valueMinorUnits || 0),
        0
      )
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
  })
}

/**
 * `create_deal`: org-scoped deal creation mirroring
 * `apps/command/src/server/deals.ts` `createDealServerFn`. Approval-gated.
 */
export function createDealTool(ctx: AgentContext) {
  return toolDefinition({
    name: "create_deal",
    description:
      "Create a new deal in the pipeline with optional company, contact, stage, value and expected close date. Approval required.",
    inputSchema: createDealInput,
    outputSchema: toolOutputSchemas.create_deal,
    needsApproval: true,
  }).server(async (args) => {
    const id = crypto.randomUUID()
    const [newDeal] = await db
      .insert(schema.deal)
      .values({
        id,
        organizationId: ctx.organizationId,
        companyId: args.companyId ?? null,
        contactId: args.contactId ?? null,
        title: args.title,
        stage: args.stage ?? "lead",
        valueMinorUnits: args.valueMinorUnits ?? 0,
        currency: args.currency ?? "USD",
        expectedCloseDate: args.expectedCloseDate ?? null,
        createdById: ctx.userId ?? null,
      })
      .returning()

    if (!newDeal) {
      throw new Error("Failed to create deal")
    }

    logWideEvent({
      event: "agent.deal.created",
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityId: id,
      outcome: "success",
      metadata: {
        stage: args.stage,
        valueMinorUnits: args.valueMinorUnits,
        currency: args.currency,
      },
    })

    return newDeal
  })
}

/**
 * `update_deal_stage`: move a deal to a new pipeline stage, mirroring
 * `apps/command/src/server/deals.ts` `updateDealStageServerFn`. Approval-gated.
 */
export function updateDealStageTool(ctx: AgentContext) {
  return toolDefinition({
    name: "update_deal_stage",
    description: "Move a deal to a new pipeline stage. Approval required.",
    inputSchema: updateDealStageInput,
    outputSchema: toolOutputSchemas.update_deal_stage,
    needsApproval: true,
  }).server(async (args) => {
    const [updatedDeal] = await db
      .update(schema.deal)
      .set({
        stage: args.stage,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.deal.id, args.id),
          eq(schema.deal.organizationId, ctx.organizationId)
        )
      )
      .returning()

    if (!updatedDeal) {
      throw new Error("Deal not found or unauthorized")
    }

    logWideEvent({
      event: "agent.deal.stage_updated",
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityId: args.id,
      outcome: "success",
      metadata: {
        newStage: args.stage,
      },
    })

    return updatedDeal
  })
}
