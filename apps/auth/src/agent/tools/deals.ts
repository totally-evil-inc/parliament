import { toolDefinition } from "@tanstack/ai"
import { dealAnalyticsOutput, listDealsOutput } from "@workspace/agent"
import { db, desc, eq, schema } from "@workspace/database"
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
