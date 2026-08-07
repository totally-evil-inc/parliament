import { db, desc, eq, schema } from "@workspace/database"
import type { InvoiceDraft } from "@workspace/document/schema"
import { parseInvoiceDraft } from "@workspace/document/schema"

export type InvoiceAcceptanceRecord = {
  id: string
  invoiceSnapshotId: string
  publicLinkId: string
  signerName: string
  signerEmail: string
  signatureText: string | null
  signatureImage: string | null
  otpVerified: boolean
  agreedTerms: boolean
  acceptedAt: string
  ipAddress: string | null
  userAgent: string | null
}

export type GetPublicInvoiceMetaResult =
  | { status: "not_found" }
  | { status: "unavailable"; reason: "revoked" | "expired" }
  | {
      status: "ready"
      token: string
      number: string
      sellerName: string
      recipientEmail: string | null
    }

export type GetPublicInvoiceResult =
  | { status: "not_found" }
  | { status: "unavailable"; reason: "revoked" | "expired" }
  | { status: "forbidden"; error: string }
  | {
      status: "ready"
      linkId: string
      token: string
      snapshotId: string
      document: InvoiceDraft
      paymentLinkUrl: string | null
      accepted: InvoiceAcceptanceRecord | null
    }

export type AcceptPublicInvoiceInput = {
  token: string
  signerName: string
  signerEmail: string
  signatureText?: string | null
  signatureImage?: string | null
  otpVerified?: boolean
  agreedTerms: boolean
  ipAddress?: string | null
  userAgent?: string | null
}

export async function getPublicInvoiceMeta(
  token: string
): Promise<GetPublicInvoiceMetaResult> {
  const [link] = await db
    .select({
      id: schema.invoicePublicLink.id,
      status: schema.invoicePublicLink.status,
      revokedAt: schema.invoicePublicLink.revokedAt,
      expiresAt: schema.invoicePublicLink.expiresAt,
      recipientEmail: schema.invoicePublicLink.recipientEmail,
      document: schema.invoiceSnapshot.document,
    })
    .from(schema.invoicePublicLink)
    .innerJoin(
      schema.invoiceSnapshot,
      eq(schema.invoiceSnapshot.id, schema.invoicePublicLink.invoiceSnapshotId)
    )
    .where(eq(schema.invoicePublicLink.token, token))
    .limit(1)

  if (!link) {
    return { status: "not_found" }
  }

  if (link.status === "revoked" || link.revokedAt !== null) {
    return { status: "unavailable", reason: "revoked" }
  }

  if (link.expiresAt !== null && link.expiresAt.getTime() <= Date.now()) {
    return { status: "unavailable", reason: "expired" }
  }

  const document = parseInvoiceDraft(link.document)
  return {
    status: "ready",
    token,
    number: document.data.invoiceNumber || "Invoice",
    sellerName: document.data.seller.name || "",
    recipientEmail: link.recipientEmail ?? null,
  }
}

export async function getPublicInvoice(
  token: string,
  options: {
    sessionEmail: string
    ipAddress?: string | null
    userAgent?: string | null
  }
): Promise<GetPublicInvoiceResult> {
  const [link] = await db
    .select({
      id: schema.invoicePublicLink.id,
      invoiceSnapshotId: schema.invoicePublicLink.invoiceSnapshotId,
      organizationId: schema.invoicePublicLink.organizationId,
      status: schema.invoicePublicLink.status,
      revokedAt: schema.invoicePublicLink.revokedAt,
      expiresAt: schema.invoicePublicLink.expiresAt,
      recipientEmail: schema.invoicePublicLink.recipientEmail,
      document: schema.invoiceSnapshot.document,
    })
    .from(schema.invoicePublicLink)
    .innerJoin(
      schema.invoiceSnapshot,
      eq(schema.invoiceSnapshot.id, schema.invoicePublicLink.invoiceSnapshotId)
    )
    .where(eq(schema.invoicePublicLink.token, token))
    .limit(1)

  if (!link) {
    return { status: "not_found" }
  }

  if (link.status === "revoked" || link.revokedAt !== null) {
    return { status: "unavailable", reason: "revoked" }
  }

  if (link.expiresAt !== null && link.expiresAt.getTime() <= Date.now()) {
    return { status: "unavailable", reason: "expired" }
  }

  const sessionEmail = options.sessionEmail.trim().toLowerCase()
  if (link.recipientEmail) {
    if (link.recipientEmail.trim().toLowerCase() !== sessionEmail) {
      return {
        status: "forbidden",
        error: `This document was sent to ${link.recipientEmail}. You are currently verified as ${options.sessionEmail}.`,
      }
    }
  } else {
    // Bind link recipient email on first access
    await db
      .update(schema.invoicePublicLink)
      .set({ recipientEmail: sessionEmail })
      .where(eq(schema.invoicePublicLink.id, link.id))
  }

  const document = parseInvoiceDraft(link.document)
  const tokenSuffix = token.slice(-6)

  const [org] = await db
    .select({
      paymentLinkUrl: schema.organization.paymentLinkUrl,
    })
    .from(schema.organization)
    .where(eq(schema.organization.id, link.organizationId))
    .limit(1)

  const paymentLinkUrl = org?.paymentLinkUrl ?? null

  await db.insert(schema.invoiceEvent).values({
    invoiceSnapshotId: link.invoiceSnapshotId,
    publicLinkId: link.id,
    eventType: "link.opened",
    metadata: {
      tokenSuffix,
      timestamp: new Date().toISOString(),
      ipAddress: options?.ipAddress ?? null,
      userAgent: options?.userAgent ?? null,
    },
  })

  const [acceptanceRow] = await db
    .select()
    .from(schema.invoiceAcceptance)
    .where(eq(schema.invoiceAcceptance.publicLinkId, link.id))
    .orderBy(desc(schema.invoiceAcceptance.acceptedAt))
    .limit(1)

  const accepted: InvoiceAcceptanceRecord | null = acceptanceRow
    ? {
        id: acceptanceRow.id,
        invoiceSnapshotId: acceptanceRow.invoiceSnapshotId,
        publicLinkId: acceptanceRow.publicLinkId,
        signerName: acceptanceRow.signerName,
        signerEmail: acceptanceRow.signerEmail,
        signatureText: acceptanceRow.signatureText,
        signatureImage: acceptanceRow.signatureImage,
        otpVerified: acceptanceRow.otpVerified,
        agreedTerms: acceptanceRow.agreedTerms,
        acceptedAt: acceptanceRow.acceptedAt.toISOString(),
        ipAddress: acceptanceRow.ipAddress,
        userAgent: acceptanceRow.userAgent,
      }
    : null

  return {
    status: "ready",
    linkId: link.id,
    token,
    snapshotId: link.invoiceSnapshotId,
    document,
    paymentLinkUrl,
    accepted,
  }
}

export async function acceptPublicInvoice(
  input: AcceptPublicInvoiceInput
): Promise<InvoiceAcceptanceRecord> {
  const [link] = await db
    .select({
      id: schema.invoicePublicLink.id,
      invoiceSnapshotId: schema.invoicePublicLink.invoiceSnapshotId,
      status: schema.invoicePublicLink.status,
      revokedAt: schema.invoicePublicLink.revokedAt,
      expiresAt: schema.invoicePublicLink.expiresAt,
      invoiceDraftId: schema.invoiceSnapshot.invoiceDraftId,
    })
    .from(schema.invoicePublicLink)
    .innerJoin(
      schema.invoiceSnapshot,
      eq(schema.invoiceSnapshot.id, schema.invoicePublicLink.invoiceSnapshotId)
    )
    .where(eq(schema.invoicePublicLink.token, input.token))
    .limit(1)

  if (!link) {
    throw new Error("Invoice link not found")
  }

  if (link.status === "revoked" || link.revokedAt !== null) {
    throw new Error("Invoice link is revoked or unavailable")
  }

  if (link.expiresAt !== null && link.expiresAt.getTime() <= Date.now()) {
    throw new Error("Invoice link has expired")
  }

  if (!input.agreedTerms) {
    throw new Error("Terms must be agreed to accept invoice")
  }

  const acceptance = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.invoiceAcceptance)
      .values({
        invoiceSnapshotId: link.invoiceSnapshotId,
        publicLinkId: link.id,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
        signatureText: input.signatureText ?? null,
        signatureImage: input.signatureImage ?? null,
        otpVerified: input.otpVerified ?? false,
        agreedTerms: input.agreedTerms,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      })
      .returning()

    if (!row) {
      throw new Error("Failed to insert invoice acceptance")
    }

    await tx.insert(schema.invoiceEvent).values({
      invoiceSnapshotId: link.invoiceSnapshotId,
      publicLinkId: link.id,
      eventType: "signature.completed",
      metadata: {
        acceptanceId: row.id,
        timestamp: new Date().toISOString(),
        signerEmail: input.signerEmail,
      },
    })

    await tx
      .update(schema.invoiceDraft)
      .set({
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(eq(schema.invoiceDraft.id, link.invoiceDraftId))

    return {
      id: row.id,
      invoiceSnapshotId: row.invoiceSnapshotId,
      publicLinkId: row.publicLinkId,
      signerName: row.signerName,
      signerEmail: row.signerEmail,
      signatureText: row.signatureText,
      signatureImage: row.signatureImage,
      otpVerified: row.otpVerified,
      agreedTerms: row.agreedTerms,
      acceptedAt: row.acceptedAt.toISOString(),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    }
  })

  return acceptance
}
