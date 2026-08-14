import { randomBytes } from "node:crypto"
import { and, db, eq, schema } from "@workspace/database"
import {
  calculateInvoicePricing,
  calculateProposalPricing,
} from "@workspace/document/calculate"
import {
  finalizeInvoiceDraft as buildInvoiceSnapshotPayload,
  finalizeProposalDraft as buildProposalSnapshotPayload,
} from "@workspace/document/finalize"
import {
  safeParseInvoiceDraft,
  safeParseProposalDraft,
} from "@workspace/document/schema"

export interface FinalizeSendResult {
  snapshotId: string
  token: string
  shareUrl: string
  documentType: "proposal" | "invoice"
  documentTitle: string
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
  const [current] = await db
    .select()
    .from(schema.proposalDraft)
    .where(
      and(
        eq(schema.proposalDraft.id, draftId),
        eq(schema.proposalDraft.organizationId, organizationId)
      )
    )
    .limit(1)

  if (!current) {
    throw new Error(`Proposal draft with id ${draftId} was not found.`)
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
  const [current] = await db
    .select()
    .from(schema.invoiceDraft)
    .where(
      and(
        eq(schema.invoiceDraft.id, draftId),
        eq(schema.invoiceDraft.organizationId, organizationId)
      )
    )
    .limit(1)

  if (!current) {
    throw new Error(`Invoice draft with id ${draftId} was not found.`)
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
    totalMinorUnits,
    currency,
    recipientEmail,
  }
}
