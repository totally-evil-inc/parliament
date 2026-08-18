import { randomBytes } from "node:crypto"
import { and, db, eq, schema, sql } from "@workspace/database"
import {
  calculateInvoicePricing,
  calculateProposalPricing,
} from "@workspace/document/calculate"
import {
  finalizeInvoiceDraft as buildInvoiceSnapshotPayload,
  finalizeProposalDraft as buildProposalSnapshotPayload,
} from "@workspace/document/finalize"
import {
  type InvoiceDraft,
  type ProposalDraft,
  safeParseInvoiceDraft,
  safeParseProposalDraft,
} from "@workspace/document/schema"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface FinalizeSendResult {
  snapshotId: string
  token: string
  shareUrl: string
  documentType: "proposal" | "invoice"
  documentTitle: string
  document: ProposalDraft | InvoiceDraft
  totalMinorUnits?: number
  currency?: string
  recipientEmail?: string
}

export function createPublicToken(): string {
  return randomBytes(24).toString("base64url")
}

export function getGateUrl(): string {
  return process.env.GATE_URL || "http://localhost:4100"
}

export async function finalizeProposalSend(
  draftId: string,
  organizationId: string,
  userId: string,
  overrideRecipientEmail?: string
): Promise<FinalizeSendResult> {
  let current: typeof schema.proposalDraft.$inferSelect | undefined
  const isUuid = typeof draftId === "string" && UUID_REGEX.test(draftId)

  if (isUuid) {
    const [found] = await db
      .select()
      .from(schema.proposalDraft)
      .where(
        and(
          eq(schema.proposalDraft.id, draftId),
          eq(schema.proposalDraft.organizationId, organizationId)
        )
      )
      .limit(1)
    current = found
  } else if (draftId) {
    const [found] = await db
      .select()
      .from(schema.proposalDraft)
      .where(
        and(
          eq(schema.proposalDraft.organizationId, organizationId),
          sql`lower(${schema.proposalDraft.title}) LIKE lower(${`%${draftId}%`})`
        )
      )
      .limit(1)
    current = found
  }

  if (!current) {
    throw new Error(`Proposal draft "${draftId}" was not found.`)
  }

  const parsedDoc = safeParseProposalDraft(current.document)
  if (!parsedDoc.success) {
    throw new Error("Proposal draft document is invalid.")
  }

  const snapshotPayload = buildProposalSnapshotPayload(current.document)
  const token = createPublicToken()
  const recipientEmail =
    overrideRecipientEmail || parsedDoc.data.data.customer?.email || undefined

  let totalMinorUnits: number | undefined
  let currency: string | undefined
  if (parsedDoc.data.data.pricing) {
    try {
      const calc = calculateProposalPricing(parsedDoc.data.data.pricing)
      totalMinorUnits = calc.totalMinor
      currency = parsedDoc.data.data.pricing.currency
    } catch (_e) {
      // ignore
    }
  }

  const snapshotId = await db.transaction(async (tx) => {
    const [snapshot] = await tx
      .insert(schema.proposalSnapshot)
      .values({
        proposalDraftId: current.id,
        organizationId,
        document: snapshotPayload.document,
        contentHash: snapshotPayload.contentHash,
        templateId: snapshotPayload.templateId,
        templateVersion: snapshotPayload.templateVersion,
        calculationVersion: snapshotPayload.calculationVersion,
        createdByUserId: userId,
      })
      .returning()

    if (!snapshot) throw new Error("Failed to create proposal snapshot")

    await tx.insert(schema.proposalPublicLink).values({
      proposalSnapshotId: snapshot.id,
      organizationId,
      token,
      status: "active",
      recipientEmail: recipientEmail ?? null,
    })

    await tx
      .update(schema.proposalDraft)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(schema.proposalDraft.id, current.id))

    return snapshot.id
  })

  const shareUrl = `${getGateUrl()}/p/${token}`

  return {
    snapshotId,
    token,
    shareUrl,
    documentType: "proposal",
    documentTitle: current.title,
    document: snapshotPayload.document,
    totalMinorUnits,
    currency,
    recipientEmail,
  }
}

export async function finalizeInvoiceSend(
  draftId: string,
  organizationId: string,
  userId: string,
  overrideRecipientEmail?: string
): Promise<FinalizeSendResult> {
  let current: typeof schema.invoiceDraft.$inferSelect | undefined
  const isUuid = typeof draftId === "string" && UUID_REGEX.test(draftId)

  if (isUuid) {
    const [found] = await db
      .select()
      .from(schema.invoiceDraft)
      .where(
        and(
          eq(schema.invoiceDraft.id, draftId),
          eq(schema.invoiceDraft.organizationId, organizationId)
        )
      )
      .limit(1)
    current = found
  } else if (draftId) {
    const [found] = await db
      .select()
      .from(schema.invoiceDraft)
      .where(
        and(
          eq(schema.invoiceDraft.organizationId, organizationId),
          sql`lower(${schema.invoiceDraft.title}) LIKE lower(${`%${draftId}%`})`
        )
      )
      .limit(1)
    current = found
  }

  if (!current) {
    throw new Error(`Invoice draft "${draftId}" was not found.`)
  }

  const parsedDoc = safeParseInvoiceDraft(current.document)
  if (!parsedDoc.success) {
    throw new Error("Invoice draft document is invalid.")
  }

  const snapshotPayload = buildInvoiceSnapshotPayload(current.document)
  const token = createPublicToken()
  const recipientEmail =
    overrideRecipientEmail || parsedDoc.data.data.customer?.email || undefined

  let totalMinorUnits: number | undefined
  let currency: string | undefined
  if (parsedDoc.data.data.pricing) {
    try {
      const calc = calculateInvoicePricing(parsedDoc.data.data.pricing)
      totalMinorUnits = calc.totalMinor
      currency = parsedDoc.data.data.pricing.currency
    } catch (_e) {
      // ignore
    }
  }

  const snapshotId = await db.transaction(async (tx) => {
    const [snapshot] = await tx
      .insert(schema.invoiceSnapshot)
      .values({
        invoiceDraftId: current.id,
        organizationId,
        document: snapshotPayload.document,
        contentHash: snapshotPayload.contentHash,
        templateId: snapshotPayload.templateId,
        templateVersion: snapshotPayload.templateVersion,
        calculationVersion: snapshotPayload.calculationVersion,
        createdByUserId: userId,
      })
      .returning()

    if (!snapshot) throw new Error("Failed to create invoice snapshot")

    await tx.insert(schema.invoicePublicLink).values({
      invoiceSnapshotId: snapshot.id,
      organizationId,
      token,
      status: "active",
      recipientEmail: recipientEmail ?? null,
    })

    await tx
      .update(schema.invoiceDraft)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(schema.invoiceDraft.id, current.id))

    return snapshot.id
  })

  const shareUrl = `${getGateUrl()}/i/${token}`

  return {
    snapshotId,
    token,
    shareUrl,
    documentType: "invoice",
    documentTitle: current.title,
    document: snapshotPayload.document,
    totalMinorUnits,
    currency,
    recipientEmail,
  }
}
