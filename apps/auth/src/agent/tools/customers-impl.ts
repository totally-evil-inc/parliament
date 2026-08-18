import { and, count, db, desc, eq, gte, schema, sql } from "@workspace/database"
import type { AgentContext } from "../tool-ctx"

export async function listCustomersTool(
  _args: Record<string, never>,
  ctx: AgentContext
) {
  const rows = await db
    .select({
      id: schema.company.id,
      name: schema.company.name,
      billingEmail: schema.company.billingEmail,
      status: schema.company.status,
      proposalsCount: count(schema.proposal.id),
      totalRevenueMinorUnits: sql<number>`coalesce(sum(${schema.proposal.totalMinorUnits}), 0)::int`,
      updatedAt: schema.company.updatedAt,
    })
    .from(schema.company)
    .leftJoin(schema.proposal, eq(schema.proposal.companyId, schema.company.id))
    .where(eq(schema.company.organizationId, ctx.organizationId))
    .groupBy(schema.company.id)
    .orderBy(desc(schema.company.updatedAt))

  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      billingEmail: r.billingEmail ?? undefined,
      status: r.status,
      proposalsCount: Number(r.proposalsCount),
      totalRevenueMinorUnits: Number(r.totalRevenueMinorUnits),
      updatedAt: r.updatedAt.toISOString(),
    })),
  }
}

export async function customerAnalyticsTool(
  _args: Record<string, never>,
  ctx: AgentContext
) {
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [countResult] = await db
    .select({ total: count(schema.company.id) })
    .from(schema.company)
    .where(eq(schema.company.organizationId, ctx.organizationId))

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
    .where(eq(schema.company.organizationId, ctx.organizationId))
    .groupBy(schema.company.id, schema.company.name)
    .orderBy(sql`sum(${schema.proposal.totalMinorUnits}) DESC`)
    .limit(1)

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
    .where(eq(schema.company.organizationId, ctx.organizationId))
    .groupBy(schema.company.id, schema.company.name)
    .orderBy(sql`count(${schema.proposal.id}) DESC`)
    .limit(1)

  const [inactiveRow] = await db
    .select({ total: count(schema.company.id) })
    .from(schema.company)
    .where(
      and(
        eq(schema.company.organizationId, ctx.organizationId),
        eq(schema.company.status, "inactive")
      )
    )

  const [newThisMonthRow] = await db
    .select({ total: count(schema.company.id) })
    .from(schema.company)
    .where(
      and(
        eq(schema.company.organizationId, ctx.organizationId),
        gte(schema.company.createdAt, firstDayOfMonth)
      )
    )

  return {
    totalCustomersCount: Number(countResult?.total || 0),
    topRevenueClient: topRevenueRow
      ? {
          name: topRevenueRow.name,
          revenueMinorUnits: Number(topRevenueRow.revenueMinorUnits),
        }
      : null,
    mostActiveClient: mostActiveRow
      ? {
          name: mostActiveRow.name,
          proposalsCount: Number(mostActiveRow.proposalsCount),
        }
      : null,
    inactiveClientsCount: Number(inactiveRow?.total || 0),
    newCustomersThisMonth: Number(newThisMonthRow?.total || 0),
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function customerDetailsTool(
  args: { id: string },
  ctx: AgentContext
) {
  let customerRow: typeof schema.company.$inferSelect | undefined
  const isUuid = typeof args.id === "string" && UUID_REGEX.test(args.id)

  if (isUuid) {
    const [row] = await db
      .select()
      .from(schema.company)
      .where(
        and(
          eq(schema.company.id, args.id),
          eq(schema.company.organizationId, ctx.organizationId)
        )
      )
      .limit(1)
    customerRow = row
  } else if (args.id) {
    const [row] = await db
      .select()
      .from(schema.company)
      .where(
        and(
          eq(schema.company.organizationId, ctx.organizationId),
          sql`lower(${schema.company.name}) LIKE lower(${`%${args.id}%`})`
        )
      )
      .limit(1)
    customerRow = row
  }

  if (!customerRow) {
    return {
      error: {
        code: "not_found" as const,
        message: `Client "${args.id}" was not found in this organization.`,
      },
    }
  }

  const companyId = customerRow.id

  const contacts = await db
    .select()
    .from(schema.contact)
    .where(
      and(
        eq(schema.contact.companyId, companyId),
        eq(schema.contact.organizationId, ctx.organizationId)
      )
    )
    .orderBy(desc(schema.contact.createdAt))

  const deals = await db
    .select()
    .from(schema.deal)
    .where(
      and(
        eq(schema.deal.companyId, companyId),
        eq(schema.deal.organizationId, ctx.organizationId)
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
        eq(schema.proposal.companyId, companyId),
        eq(schema.proposal.organizationId, ctx.organizationId)
      )
    )
    .orderBy(desc(schema.proposal.createdAt))

  return {
    customer: {
      id: customerRow.id,
      name: customerRow.name,
      billingEmail: customerRow.billingEmail ?? undefined,
      phone: customerRow.phone ?? undefined,
      website: customerRow.website ?? undefined,
      domain: customerRow.domain ?? undefined,
      vatNumber: customerRow.vatNumber ?? undefined,
      city: customerRow.city ?? undefined,
      country: customerRow.country ?? undefined,
      note: customerRow.note ?? undefined,
      status: customerRow.status,
      preferredCurrency: customerRow.preferredCurrency ?? undefined,
      industry: customerRow.industry ?? undefined,
      isArchived: customerRow.isArchived,
      createdAt: customerRow.createdAt.toISOString(),
      updatedAt: customerRow.updatedAt.toISOString(),
    },
    contacts: contacts.map((c) => ({
      id: c.id,
      name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || undefined,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      role: c.role ?? undefined,
      createdAt: c.createdAt.toISOString(),
    })),
    deals: deals.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      valueMinorUnits: d.valueMinorUnits ?? undefined,
      currency: d.currency ?? undefined,
      expectedCloseDate: d.expectedCloseDate ?? undefined,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    proposals: proposals.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      totalMinorUnits: p.totalMinorUnits ?? undefined,
      currency: p.currency ?? undefined,
      createdAt: p.createdAt.toISOString(),
    })),
  }
}
