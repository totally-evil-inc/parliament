import { isUuid } from "@workspace/agent"
import { and, count, db, desc, eq, schema, sql } from "@workspace/database"
import { escapeLikePattern } from "./sql-utils"
import {
  calculateInvoicePricing,
  calculateProposalPricing,
} from "@workspace/document/calculate"
import {
  safeParseInvoiceDraft,
  safeParseProposalDraft,
} from "@workspace/document/schema"
import type { AgentContext } from "../tool-ctx"

export async function listProposalsTool(
  _args: Record<string, never>,
  ctx: AgentContext
) {
  const rows = await db
    .select()
    .from(schema.proposalDraft)
    .where(eq(schema.proposalDraft.organizationId, ctx.organizationId))
    .orderBy(desc(schema.proposalDraft.updatedAt))

  const formattedRows = await Promise.all(
    rows.map(async (row) => {
      const latestLink = await db
        .select({ token: schema.proposalPublicLink.token })
        .from(schema.proposalSnapshot)
        .innerJoin(
          schema.proposalPublicLink,
          eq(
            schema.proposalPublicLink.proposalSnapshotId,
            schema.proposalSnapshot.id
          )
        )
        .where(
          and(
            eq(schema.proposalSnapshot.proposalDraftId, row.id),
            eq(schema.proposalPublicLink.status, "active")
          )
        )
        .orderBy(desc(schema.proposalPublicLink.createdAt))
        .limit(1)

      const [viewSummary] = await db
        .select({
          viewCount: count(),
          lastViewedAt: sql<Date | null>`max(${schema.proposalEvent.createdAt})`,
        })
        .from(schema.proposalSnapshot)
        .innerJoin(
          schema.proposalEvent,
          eq(
            schema.proposalEvent.proposalSnapshotId,
            schema.proposalSnapshot.id
          )
        )
        .where(
          and(
            eq(schema.proposalSnapshot.proposalDraftId, row.id),
            eq(schema.proposalEvent.eventType, "opened")
          )
        )

      const latestAcceptance = await db
        .select({ acceptedAt: schema.proposalAcceptance.acceptedAt })
        .from(schema.proposalSnapshot)
        .innerJoin(
          schema.proposalAcceptance,
          eq(
            schema.proposalAcceptance.proposalSnapshotId,
            schema.proposalSnapshot.id
          )
        )
        .where(eq(schema.proposalSnapshot.proposalDraftId, row.id))
        .orderBy(desc(schema.proposalAcceptance.acceptedAt))
        .limit(1)

      const parsed = safeParseProposalDraft(row.document)
      let valueMinor = 0
      let currency = "USD"
      let customerName = ""
      let issueDate = row.createdAt.toISOString().split("T")[0]
      let validUntil: string | null = null

      if (parsed.success) {
        customerName = parsed.data.data.customer.name
        issueDate = parsed.data.data.issueDate
        validUntil = parsed.data.data.validUntil ?? null
        if (parsed.data.data.pricing) {
          try {
            const calc = calculateProposalPricing(parsed.data.data.pricing)
            valueMinor = calc.totalMinor
            currency = parsed.data.data.pricing.currency
          } catch (_e) {
            // ignore
          }
        }
      }

      return {
        id: row.id,
        title: row.title,
        status: row.status,
        revision: row.revision,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        viewCount: Number(viewSummary?.viewCount ?? 0),
        lastViewedAt: viewSummary?.lastViewedAt?.toISOString() ?? null,
        acceptedAt: latestAcceptance[0]?.acceptedAt.toISOString() ?? null,
        publicToken: latestLink[0]?.token ?? null,
        customerName,
        issueDate,
        validUntil,
        valueMinor,
        currency,
      }
    })
  )

  return { rows: formattedRows }
}

export async function getProposalSummaryTool(
  args: { id: string },
  ctx: AgentContext
) {
  let row: typeof schema.proposalDraft.$inferSelect | undefined
  const validUuid = isUuid(args.id)

  if (validUuid) {
    const [found] = await db
      .select()
      .from(schema.proposalDraft)
      .where(
        and(
          eq(schema.proposalDraft.id, args.id.trim()),
          eq(schema.proposalDraft.organizationId, ctx.organizationId)
        )
      )
      .limit(1)
    row = found
  } else if (args.id) {
    const escaped = escapeLikePattern(args.id)
    const [found] = await db
      .select()
      .from(schema.proposalDraft)
      .where(
        and(
          eq(schema.proposalDraft.organizationId, ctx.organizationId),
          sql`lower(${schema.proposalDraft.title}) LIKE lower(${`%${escaped}%`})`
        )
      )
      .limit(1)
    row = found
  }

  if (!row) {
    return {
      error: {
        code: "not_found" as const,
        message: `Proposal draft "${args.id}" was not found.`,
      },
    }
  }

  const parsed = safeParseProposalDraft(row.document)
  if (!parsed.success) {
    return {
      error: {
        code: "validation" as const,
        message: "Proposal draft document could not be parsed.",
      },
    }
  }

  let subtotalMinorUnits = 0
  let taxMinorUnits = 0
  let totalMinorUnits = 0
  let currency = "USD"

  if (parsed.data.data.pricing) {
    try {
      const calc = calculateProposalPricing(parsed.data.data.pricing)
      subtotalMinorUnits = calc.subtotalMinor
      taxMinorUnits = calc.taxMinor
      totalMinorUnits = calc.totalMinor
      currency = parsed.data.data.pricing.currency
    } catch (_e) {
      // ignore
    }
  }

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    revision: row.revision,
    currency,
    subtotalMinorUnits,
    taxMinorUnits,
    totalMinorUnits,
    customerName: parsed.data.data.customer.name,
    customerEmail: parsed.data.data.customer.email ?? undefined,
    companyName: parsed.data.data.seller.name || "My Company",
    contactEmail: undefined,
    validUntil: parsed.data.data.validUntil ?? undefined,
  }
}

export async function listInvoicesTool(
  _args: Record<string, never>,
  ctx: AgentContext
) {
  const rows = await db
    .select()
    .from(schema.invoiceDraft)
    .where(eq(schema.invoiceDraft.organizationId, ctx.organizationId))
    .orderBy(desc(schema.invoiceDraft.updatedAt))

  const formattedRows = await Promise.all(
    rows.map(async (row) => {
      const latestLink = await db
        .select({ token: schema.invoicePublicLink.token })
        .from(schema.invoiceSnapshot)
        .innerJoin(
          schema.invoicePublicLink,
          eq(
            schema.invoicePublicLink.invoiceSnapshotId,
            schema.invoiceSnapshot.id
          )
        )
        .where(
          and(
            eq(schema.invoiceSnapshot.invoiceDraftId, row.id),
            eq(schema.invoicePublicLink.status, "active")
          )
        )
        .orderBy(desc(schema.invoicePublicLink.createdAt))
        .limit(1)

      const [viewSummary] = await db
        .select({
          viewCount: count(),
          lastViewedAt: sql<Date | null>`max(${schema.invoiceEvent.createdAt})`,
        })
        .from(schema.invoiceSnapshot)
        .innerJoin(
          schema.invoiceEvent,
          eq(schema.invoiceEvent.invoiceSnapshotId, schema.invoiceSnapshot.id)
        )
        .where(
          and(
            eq(schema.invoiceSnapshot.invoiceDraftId, row.id),
            eq(schema.invoiceEvent.eventType, "opened")
          )
        )

      const parsed = safeParseInvoiceDraft(row.document)
      let valueMinor = 0
      let currency = "USD"
      let customerName = ""
      let issueDate = row.createdAt.toISOString().split("T")[0]
      let dueDate = row.createdAt.toISOString().split("T")[0]
      let invoiceNumber = ""

      if (parsed.success) {
        customerName = parsed.data.data.customer.name
        issueDate = parsed.data.data.issueDate
        dueDate = parsed.data.data.dueDate
        invoiceNumber = parsed.data.data.invoiceNumber
        if (parsed.data.data.pricing) {
          try {
            const calc = calculateInvoicePricing(parsed.data.data.pricing)
            valueMinor = calc.totalMinor
            currency = parsed.data.data.pricing.currency
          } catch (_e) {
            // ignore
          }
        }
      }

      return {
        id: row.id,
        title: row.title,
        status: row.status,
        revision: row.revision,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        viewCount: Number(viewSummary?.viewCount ?? 0),
        lastViewedAt: viewSummary?.lastViewedAt?.toISOString() ?? null,
        publicToken: latestLink[0]?.token ?? null,
        customerName,
        issueDate,
        dueDate,
        valueMinor,
        currency,
        invoiceNumber,
      }
    })
  )

  return { rows: formattedRows }
}

export async function getInvoiceSummaryTool(
  args: { id: string },
  ctx: AgentContext
) {
  let row: typeof schema.invoiceDraft.$inferSelect | undefined
  const validUuid = isUuid(args.id)

  if (validUuid) {
    const [found] = await db
      .select()
      .from(schema.invoiceDraft)
      .where(
        and(
          eq(schema.invoiceDraft.id, args.id.trim()),
          eq(schema.invoiceDraft.organizationId, ctx.organizationId)
        )
      )
      .limit(1)
    row = found
  } else if (args.id) {
    const escaped = escapeLikePattern(args.id)
    const [found] = await db
      .select()
      .from(schema.invoiceDraft)
      .where(
        and(
          eq(schema.invoiceDraft.organizationId, ctx.organizationId),
          sql`lower(${schema.invoiceDraft.title}) LIKE lower(${`%${escaped}%`})`
        )
      )
      .limit(1)
    row = found
  }

  if (!row) {
    return {
      error: {
        code: "not_found" as const,
        message: `Invoice draft "${args.id}" was not found.`,
      },
    }
  }

  const parsed = safeParseInvoiceDraft(row.document)
  if (!parsed.success) {
    return {
      error: {
        code: "validation" as const,
        message: "Invoice draft document could not be parsed.",
      },
    }
  }

  let totalMinor = 0
  let currency = "USD"
  if (parsed.data.data.pricing) {
    try {
      const calc = calculateInvoicePricing(parsed.data.data.pricing)
      totalMinor = calc.totalMinor
      currency = parsed.data.data.pricing.currency
    } catch (_e) {
      // ignore
    }
  }

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    revision: row.revision,
    currency,
    totalMinor,
    issueDate: parsed.data.data.issueDate,
    dueDate: parsed.data.data.dueDate,
    customerName: parsed.data.data.customer.name,
    customerEmail: parsed.data.data.customer.email ?? undefined,
  }
}
