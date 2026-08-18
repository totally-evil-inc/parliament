import { toolDefinition } from "@tanstack/ai"
import {
  createInvoiceInput,
  createInvoiceOutput,
  createProposalInput,
  createProposalOutput,
  getInvoiceInput,
  getInvoiceOutput,
  getProposalInput,
  getProposalOutput,
  isUuid,
  updateInvoiceInput,
  updateInvoiceOutput,
  updateProposalInput,
  updateProposalOutput,
} from "@workspace/agent"
import { and, db, eq, schema, sql } from "@workspace/database"
import {
  buildSectionBlock,
  convertDeclarativeBlock,
  normalizeCompositionBlocks,
} from "@workspace/document/builders"
import {
  calculateInvoicePricing,
  calculateProposalPricing,
  type ProposalPricing,
} from "@workspace/document/calculate"
import {
  type DocumentBlock,
  type InvoiceDraft,
  type PricingItem,
  type ProposalDraft,
  safeParseInvoiceDraft,
  safeParseProposalDraft,
} from "@workspace/document/schema"
import { logWideEvent } from "@workspace/logger"
import type { AgentContext } from "../tool-ctx"

function getCommandUrl(): string {
  return (
    Bun.env.COMMAND_SERVER_URL ||
    process.env.COMMAND_SERVER_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "")
}

function dateOnly(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function createProposalTool(ctx: AgentContext) {
  return toolDefinition({
    name: "create_proposal",
    description:
      "Create a complete proposal draft with customer snapshots, structured pricing line items, and rich block composition. Returns draft ID, calculated totals, and visual editor link.",
    inputSchema: createProposalInput,
    outputSchema: createProposalOutput,
    needsApproval: false,
  }).server(async (args) => {
    try {
      const now = new Date()
      const draftId = crypto.randomUUID()

      let customerName = args.customerName?.trim() || ""
      let customerEmail = args.customerEmail?.trim() || ""
      let customerAddress = ""
      let customerPhone = ""
      let customerWebsite = ""

      // Resolve CRM company if companyId provided
      if (args.companyId) {
        const [company] = await db
          .select()
          .from(schema.company)
          .where(
            and(
              eq(schema.company.id, args.companyId),
              eq(schema.company.organizationId, ctx.organizationId)
            )
          )
          .limit(1)

        if (company) {
          customerName = customerName || company.name
          customerEmail = customerEmail || company.billingEmail || ""
          customerAddress = [company.city, company.country]
            .filter(Boolean)
            .join(", ")
          customerPhone = company.phone || ""
          customerWebsite = company.website || ""
        }
      }

      if (!customerName) {
        customerName = "Valued Client"
      }

      const sellerParty = {
        name: ctx.orgName || "Our Company",
        email: "",
        address: "",
        phone: "",
        website: "",
        taxId: "",
        customFields: [],
      }

      const customerParty = {
        name: customerName,
        email: customerEmail,
        address: customerAddress,
        phone: customerPhone,
        website: customerWebsite,
        taxId: "",
        customFields: [],
      }

      // Convert pricing items
      const pricingItems: PricingItem[] = (args.items || []).map(
        (item, idx) => ({
          id: item.id || `pricing-item-${idx + 1}`,
          description: item.description,
          details: item.details || "",
          quantity: String(item.quantity || "1"),
          unitPriceMinor: item.unitPriceMinor,
          showDetails: item.showDetails !== false,
          showImage: Boolean(item.showImage),
        })
      )

      const pricing: ProposalPricing = {
        currency: args.currency || "USD",
        items: pricingItems,
        discount: args.discount,
        tax: args.tax,
        signerName: sellerParty.name,
        signerTitle: "Authorized Representative",
      }

      // Calculate totals
      let calc = {
        subtotalMinor: 0,
        taxMinor: 0,
        discountMinor: 0,
        totalMinor: 0,
      }
      try {
        if (pricing.items.length > 0) {
          calc = calculateProposalPricing(pricing)
        }
      } catch (_e) {
        // Fallback to 0 if calculation fails on empty
      }

      // Convert declarative blocks or create default composition
      let blocks: DocumentBlock[] = []
      if (args.blocks && args.blocks.length > 0) {
        blocks = args.blocks.map(convertDeclarativeBlock)
      } else {
        blocks = [
          buildSectionBlock({
            title: args.title,
            eyebrow: "Project Proposal",
            content:
              "This proposal details the scope, milestones, and investment required for successful project delivery.",
          }),
        ]
      }

      const normalizedBlocks = normalizeCompositionBlocks(blocks, {
        isInvoice: false,
        includePricingBlock: true,
      })

      const proposalDocument: ProposalDraft = {
        id: draftId,
        kind: "proposal",
        schemaVersion: 1,
        revision: 0,
        status: "draft",
        locale: "en-US",
        timezone: "UTC",
        template: { id: "proposal-classic", version: 1 },
        data: {
          title: args.title,
          issueDate: dateOnly(now),
          validUntil: dateOnly(addDays(now, args.validDays || 14)),
          seller: sellerParty,
          customer: customerParty,
          pricing,
        },
        composition: {
          version: 1,
          blocks: normalizedBlocks,
        },
        assets: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      await db.insert(schema.proposalDraft).values({
        id: draftId,
        organizationId: ctx.organizationId,
        createdByUserId: ctx.userId,
        title: args.title,
        status: "draft",
        document: proposalDocument,
        revision: 0,
        createdAt: now,
        updatedAt: now,
      })

      logWideEvent({
        event: "agent.proposal.created",
        outcome: "success",
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        metadata: {
          proposalId: draftId,
          title: args.title,
          totalMinorUnits: calc.totalMinor,
          currency: args.currency || "USD",
        },
      })

      const editorUrl = `${getCommandUrl()}/proposals/${draftId}`

      return {
        id: draftId,
        title: args.title,
        status: "draft",
        revision: 0,
        editorUrl,
        totalMinorUnits: calc.totalMinor,
        subtotalMinorUnits: calc.subtotalMinor,
        taxMinorUnits: calc.taxMinor,
        discountMinorUnits: calc.discountMinor,
        currency: args.currency || "USD",
        customerName,
        customerEmail: customerEmail || undefined,
        itemCount: pricingItems.length,
        blockCount: normalizedBlocks.length,
      }
    } catch (err: unknown) {
      return {
        error: {
          code: "internal" as const,
          message:
            err instanceof Error
              ? err.message
              : "Failed to create proposal draft",
        },
      }
    }
  })
}

export function createInvoiceTool(ctx: AgentContext) {
  return toolDefinition({
    name: "create_invoice",
    description:
      "Create a complete invoice draft with customer snapshots, structured line items, due dates, payment terms, and integer minor pricing calculations. Returns invoice ID, totals, and visual editor link.",
    inputSchema: createInvoiceInput,
    outputSchema: createInvoiceOutput,
    needsApproval: false,
  }).server(async (args) => {
    try {
      const now = new Date()
      const draftId = crypto.randomUUID()
      const invoiceNumber = `INV-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`

      let customerName = args.customerName?.trim() || ""
      let customerEmail = args.customerEmail?.trim() || ""
      let customerAddress = ""
      let customerPhone = ""
      let customerWebsite = ""

      if (args.companyId) {
        const [company] = await db
          .select()
          .from(schema.company)
          .where(
            and(
              eq(schema.company.id, args.companyId),
              eq(schema.company.organizationId, ctx.organizationId)
            )
          )
          .limit(1)

        if (company) {
          customerName = customerName || company.name
          customerEmail = customerEmail || company.billingEmail || ""
          customerAddress = [company.city, company.country]
            .filter(Boolean)
            .join(", ")
          customerPhone = company.phone || ""
          customerWebsite = company.website || ""
        }
      }

      if (!customerName) {
        customerName = "Valued Client"
      }

      const sellerParty = {
        name: ctx.orgName || "Our Company",
        email: "",
        address: "",
        phone: "",
        website: "",
        taxId: "",
        customFields: [],
      }

      const customerParty = {
        name: customerName,
        email: customerEmail,
        address: customerAddress,
        phone: customerPhone,
        website: customerWebsite,
        taxId: "",
        customFields: [],
      }

      const pricingItems: PricingItem[] = args.items.map((item, idx) => ({
        id: item.id || `invoice-item-${idx + 1}`,
        description: item.description,
        details: item.details || "",
        quantity: String(item.quantity || "1"),
        unitPriceMinor: item.unitPriceMinor,
        showDetails: item.showDetails !== false,
        showImage: Boolean(item.showImage),
      }))

      const pricing = {
        currency: args.currency || "USD",
        items: pricingItems,
        discount: args.discount,
        tax: args.tax,
      }

      const calc = calculateInvoicePricing(pricing)
      const issueDateStr = dateOnly(now)
      const dueDateStr = dateOnly(addDays(now, args.dueDays ?? 30))

      const normalizedBlocks = normalizeCompositionBlocks(
        [
          buildSectionBlock({
            title: args.title || "Invoice",
            content:
              args.notes ||
              "Thank you for your business. Please review the line items and remittance instructions below.",
          }),
        ],
        { isInvoice: true, includePricingBlock: true }
      )

      const invoiceDocument: InvoiceDraft = {
        id: draftId,
        kind: "invoice",
        schemaVersion: 1,
        revision: 0,
        status: "draft",
        locale: "en-US",
        timezone: "UTC",
        template: { id: "invoice-classic", version: 1 },
        data: {
          title: args.title || "Invoice",
          invoiceNumber,
          issueDate: issueDateStr,
          dueDate: dueDateStr,
          seller: sellerParty,
          customer: customerParty,
          pricing,
          paymentTerms:
            args.paymentTerms ||
            `Net ${args.dueDays ?? 30} Days. Payment due by ${dueDateStr}.`,
        },
        composition: {
          version: 1,
          blocks: normalizedBlocks,
        },
        assets: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      await db.insert(schema.invoiceDraft).values({
        id: draftId,
        organizationId: ctx.organizationId,
        createdByUserId: ctx.userId,
        title: args.title || "Invoice",
        status: "draft",
        document: invoiceDocument,
        revision: 0,
        createdAt: now,
        updatedAt: now,
      })

      logWideEvent({
        event: "agent.invoice.created",
        outcome: "success",
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        metadata: {
          invoiceId: draftId,
          invoiceNumber,
          totalMinor: calc.totalMinor,
          currency: args.currency || "USD",
        },
      })

      const editorUrl = `${getCommandUrl()}/invoices/${draftId}`

      return {
        id: draftId,
        invoiceNumber,
        title: args.title || "Invoice",
        status: "draft",
        revision: 0,
        editorUrl,
        totalMinor: calc.totalMinor,
        currency: args.currency || "USD",
        issueDate: issueDateStr,
        dueDate: dueDateStr,
        customerName,
        customerEmail: customerEmail || undefined,
      }
    } catch (err: unknown) {
      return {
        error: {
          code: "internal" as const,
          message:
            err instanceof Error
              ? err.message
              : "Failed to create invoice draft",
        },
      }
    }
  })
}

export function getProposalTool(ctx: AgentContext) {
  return toolDefinition({
    name: "get_proposal",
    description:
      "Fetch the complete structure, status, revision, block composition, and pricing breakdown of a proposal by ID.",
    inputSchema: getProposalInput,
    outputSchema: getProposalOutput,
    needsApproval: false,
  }).server(async (args) => {
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
      const [found] = await db
        .select()
        .from(schema.proposalDraft)
        .where(
          and(
            eq(schema.proposalDraft.organizationId, ctx.organizationId),
            sql`lower(${schema.proposalDraft.title}) LIKE lower(${`%${args.id}%`})`
          )
        )
        .limit(1)
      row = found
    }

    if (!row) {
      return {
        error: {
          code: "not_found" as const,
          message: `Proposal "${args.id}" was not found.`,
        },
      }
    }

    const parsed = safeParseProposalDraft(row.document)
    if (!parsed.success) {
      return {
        error: {
          code: "validation" as const,
          message: "Failed to parse proposal document structure.",
        },
      }
    }

    const doc = parsed.data
    let subtotalMinorUnits = 0
    let taxMinorUnits = 0
    let discountMinorUnits = 0
    let totalMinorUnits = 0
    let currency = "USD"

    if (doc.data.pricing) {
      try {
        const calc = calculateProposalPricing(doc.data.pricing)
        subtotalMinorUnits = calc.subtotalMinor
        taxMinorUnits = calc.taxMinor
        discountMinorUnits = calc.discountMinor
        totalMinorUnits = calc.totalMinor
        currency = doc.data.pricing.currency
      } catch (_e) {
        // ignore
      }
    }

    const blocks = (doc.composition.blocks || []).map((b) => ({
      id: b.id,
      type: b.type,
      title: "title" in b && b.title ? JSON.stringify(b.title) : undefined,
    }))

    const items = (doc.data.pricing?.items || []).map((i) => ({
      id: i.id,
      description: i.description,
      quantity: String(i.quantity),
      unitPriceMinor: i.unitPriceMinor,
    }))

    return {
      id: row.id,
      title: row.title,
      status: row.status,
      revision: row.revision,
      currency,
      subtotalMinorUnits,
      taxMinorUnits,
      discountMinorUnits,
      totalMinorUnits,
      customerName: doc.data.customer?.name || "",
      customerEmail: doc.data.customer?.email || undefined,
      companyName: doc.data.seller?.name || ctx.orgName,
      issueDate: doc.data.issueDate,
      validUntil: doc.data.validUntil ?? undefined,
      editorUrl: `${getCommandUrl()}/proposals/${row.id}`,
      blocks,
      items,
    }
  })
}

export function getInvoiceTool(ctx: AgentContext) {
  return toolDefinition({
    name: "get_invoice",
    description:
      "Fetch the complete structure, status, revision, line items, and payment details of an invoice by ID.",
    inputSchema: getInvoiceInput,
    outputSchema: getInvoiceOutput,
    needsApproval: false,
  }).server(async (args) => {
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
      const [found] = await db
        .select()
        .from(schema.invoiceDraft)
        .where(
          and(
            eq(schema.invoiceDraft.organizationId, ctx.organizationId),
            sql`lower(${schema.invoiceDraft.title}) LIKE lower(${`%${args.id}%`})`
          )
        )
        .limit(1)
      row = found
    }

    if (!row) {
      return {
        error: {
          code: "not_found" as const,
          message: `Invoice "${args.id}" was not found.`,
        },
      }
    }

    const parsed = safeParseInvoiceDraft(row.document)
    if (!parsed.success) {
      return {
        error: {
          code: "validation" as const,
          message: "Failed to parse invoice document structure.",
        },
      }
    }

    const doc = parsed.data
    let totalMinor = 0
    let currency = "USD"

    if (doc.data.pricing) {
      try {
        const calc = calculateInvoicePricing(doc.data.pricing)
        totalMinor = calc.totalMinor
        currency = doc.data.pricing.currency
      } catch (_e) {
        // ignore
      }
    }

    const items = (doc.data.pricing?.items || []).map((i) => ({
      id: i.id,
      description: i.description,
      quantity: String(i.quantity),
      unitPriceMinor: i.unitPriceMinor,
    }))

    return {
      id: row.id,
      invoiceNumber: doc.data.invoiceNumber || "",
      title: row.title,
      status: row.status,
      revision: row.revision,
      currency,
      totalMinor,
      issueDate: doc.data.issueDate,
      dueDate: doc.data.dueDate,
      customerName: doc.data.customer?.name || "",
      customerEmail: doc.data.customer?.email || undefined,
      paymentTerms: doc.data.paymentTerms || undefined,
      editorUrl: `${getCommandUrl()}/invoices/${row.id}`,
      items,
    }
  })
}

export function updateProposalTool(ctx: AgentContext) {
  return toolDefinition({
    name: "update_proposal",
    description:
      "Atomically update a proposal's title, customer, pricing, or block composition with optimistic revision locking (expectedRevision).",
    inputSchema: updateProposalInput,
    outputSchema: updateProposalOutput,
    needsApproval: false,
  }).server(async (args) => {
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
      const [found] = await db
        .select()
        .from(schema.proposalDraft)
        .where(
          and(
            eq(schema.proposalDraft.organizationId, ctx.organizationId),
            sql`lower(${schema.proposalDraft.title}) LIKE lower(${`%${args.id}%`})`
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

    if (
      row.status === "sent" ||
      row.status === "finalized" ||
      row.status === "accepted" ||
      row.status === "declined"
    ) {
      return {
        error: {
          code: "validation" as const,
          message: `Cannot update proposal because its status is "${row.status}". Create a new draft instead.`,
        },
      }
    }

    // Optimistic revision locking
    if (
      args.expectedRevision !== undefined &&
      row.revision !== args.expectedRevision
    ) {
      return {
        error: {
          code: "validation" as const,
          message: `Revision conflict: expected revision ${args.expectedRevision}, but server revision is ${row.revision}. Fetch the latest draft with get_proposal before updating.`,
        },
      }
    }

    const parsed = safeParseProposalDraft(row.document)
    if (!parsed.success) {
      return {
        error: {
          code: "validation" as const,
          message: "Existing proposal document could not be parsed.",
        },
      }
    }

    const doc = parsed.data
    const updatedTitle = args.title?.trim() || doc.data.title

    if (args.customerName) {
      doc.data.customer.name = args.customerName.trim()
    }
    if (args.customerEmail) {
      doc.data.customer.email = args.customerEmail.trim()
    }
    if (args.validDays) {
      const issueDate = new Date(doc.data.issueDate || Date.now())
      doc.data.validUntil = dateOnly(addDays(issueDate, args.validDays))
    }

    if (!doc.data.pricing) {
      doc.data.pricing = {
        currency: args.currency || "USD",
        items: [],
        signerName: "",
        signerTitle: "Signature",
      }
    }

    if (args.items) {
      doc.data.pricing.items = args.items.map((item, idx) => ({
        id: item.id || `pricing-item-${idx + 1}`,
        description: item.description,
        details: item.details || "",
        quantity: String(item.quantity || "1"),
        unitPriceMinor: item.unitPriceMinor,
        showDetails: item.showDetails !== false,
        showImage: Boolean(item.showImage),
      }))
    }
    if (args.currency) {
      doc.data.pricing.currency = args.currency
    }
    if (args.discount !== undefined) {
      doc.data.pricing.discount = args.discount
    }
    if (args.tax !== undefined) {
      doc.data.pricing.tax = args.tax
    }

    if (args.blocks && args.blocks.length > 0) {
      const converted = args.blocks.map(convertDeclarativeBlock)
      doc.composition.blocks = normalizeCompositionBlocks(converted, {
        isInvoice: false,
        includePricingBlock: true,
      })
    }

    const nextRevision = row.revision + 1
    doc.revision = nextRevision
    doc.data.title = updatedTitle
    doc.updatedAt = new Date().toISOString()

    const calc = calculateProposalPricing(doc.data.pricing)

    await db
      .update(schema.proposalDraft)
      .set({
        title: updatedTitle,
        document: doc,
        revision: nextRevision,
        updatedAt: new Date(),
      })
      .where(eq(schema.proposalDraft.id, row.id))

    logWideEvent({
      event: "agent.proposal.updated",
      outcome: "success",
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      metadata: {
        proposalId: row.id,
        revision: nextRevision,
        totalMinorUnits: calc.totalMinor,
      },
    })

    return {
      id: row.id,
      title: updatedTitle,
      revision: nextRevision,
      editorUrl: `${getCommandUrl()}/proposals/${row.id}`,
      totalMinorUnits: calc.totalMinor,
      currency: doc.data.pricing.currency,
      status: row.status,
    }
  })
}

export function updateInvoiceTool(ctx: AgentContext) {
  return toolDefinition({
    name: "update_invoice",
    description:
      "Atomically update an invoice's title, due date, line items, payment terms, or customer details with optimistic revision locking (expectedRevision).",
    inputSchema: updateInvoiceInput,
    outputSchema: updateInvoiceOutput,
    needsApproval: false,
  }).server(async (args) => {
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
      const [found] = await db
        .select()
        .from(schema.invoiceDraft)
        .where(
          and(
            eq(schema.invoiceDraft.organizationId, ctx.organizationId),
            sql`lower(${schema.invoiceDraft.title}) LIKE lower(${`%${args.id}%`})`
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

    if (row.status !== "draft") {
      return {
        error: {
          code: "validation" as const,
          message: `Cannot update invoice because its status is "${row.status}". Create a new invoice instead.`,
        },
      }
    }

    if (
      args.expectedRevision !== undefined &&
      row.revision !== args.expectedRevision
    ) {
      return {
        error: {
          code: "validation" as const,
          message: `Revision conflict: expected revision ${args.expectedRevision}, but server revision is ${row.revision}. Fetch latest draft with get_invoice before updating.`,
        },
      }
    }

    const parsed = safeParseInvoiceDraft(row.document)
    if (!parsed.success) {
      return {
        error: {
          code: "validation" as const,
          message: "Existing invoice document could not be parsed.",
        },
      }
    }

    const doc = parsed.data
    const updatedTitle = args.title?.trim() || doc.data.title

    if (args.customerName) {
      doc.data.customer.name = args.customerName.trim()
    }
    if (args.customerEmail) {
      doc.data.customer.email = args.customerEmail.trim()
    }
    if (args.dueDate) {
      doc.data.dueDate = args.dueDate
    } else if (args.dueDays !== undefined) {
      const issueDate = new Date(doc.data.issueDate || Date.now())
      doc.data.dueDate = dateOnly(addDays(issueDate, args.dueDays))
    }
    if (args.paymentTerms) {
      doc.data.paymentTerms = args.paymentTerms
    }

    if (!doc.data.pricing) {
      doc.data.pricing = {
        currency: "USD",
        items: [],
      }
    }

    if (args.items) {
      doc.data.pricing.items = args.items.map((item, idx) => ({
        id: item.id || `invoice-item-${idx + 1}`,
        description: item.description,
        details: item.details || "",
        quantity: String(item.quantity || "1"),
        unitPriceMinor: item.unitPriceMinor,
        showDetails: item.showDetails !== false,
        showImage: Boolean(item.showImage),
      }))
    }
    if (args.discount !== undefined) {
      doc.data.pricing.discount = args.discount
    }
    if (args.tax !== undefined) {
      doc.data.pricing.tax = args.tax
    }

    const nextRevision = row.revision + 1
    doc.revision = nextRevision
    doc.data.title = updatedTitle
    doc.updatedAt = new Date().toISOString()

    const calc = calculateInvoicePricing(doc.data.pricing)

    await db
      .update(schema.invoiceDraft)
      .set({
        title: updatedTitle,
        document: doc,
        revision: nextRevision,
        updatedAt: new Date(),
      })
      .where(eq(schema.invoiceDraft.id, row.id))

    logWideEvent({
      event: "agent.invoice.updated",
      outcome: "success",
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      metadata: {
        invoiceId: row.id,
        revision: nextRevision,
        totalMinor: calc.totalMinor,
      },
    })

    return {
      id: row.id,
      title: updatedTitle,
      revision: nextRevision,
      editorUrl: `${getCommandUrl()}/invoices/${row.id}`,
      totalMinor: calc.totalMinor,
      currency: doc.data.pricing.currency,
      status: row.status,
    }
  })
}
