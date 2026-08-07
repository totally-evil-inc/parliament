import { db, desc, eq, schema } from "@workspace/database"
import type { ProposalDraft } from "@workspace/document/schema"
import { parseProposalDraft } from "@workspace/document/schema"

export type ProposalAcceptanceRecord = {
  id: string
  proposalSnapshotId: string
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

export type GetPublicProposalResult =
  | { status: "not_found" }
  | { status: "unavailable"; reason: "revoked" | "expired" }
  | {
      status: "ready"
      linkId: string
      token: string
      snapshotId: string
      document: ProposalDraft
      accepted: ProposalAcceptanceRecord | null
    }

export type AcceptPublicProposalInput = {
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

export async function getPublicProposal(
  token: string,
  options?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<GetPublicProposalResult> {
  const [link] = await db
    .select({
      id: schema.proposalPublicLink.id,
      proposalSnapshotId: schema.proposalPublicLink.proposalSnapshotId,
      status: schema.proposalPublicLink.status,
      revokedAt: schema.proposalPublicLink.revokedAt,
      expiresAt: schema.proposalPublicLink.expiresAt,
      document: schema.proposalSnapshot.document,
    })
    .from(schema.proposalPublicLink)
    .innerJoin(
      schema.proposalSnapshot,
      eq(
        schema.proposalSnapshot.id,
        schema.proposalPublicLink.proposalSnapshotId
      )
    )
    .where(eq(schema.proposalPublicLink.token, token))
    .limit(1)

  if (!link) {
    return { status: "not_found" }
  }

  if (link.status !== "active" || link.revokedAt !== null) {
    return { status: "unavailable", reason: "revoked" }
  }

  if (link.expiresAt !== null && link.expiresAt.getTime() <= Date.now()) {
    return { status: "unavailable", reason: "expired" }
  }

  const document = parseProposalDraft(link.document)
  const tokenSuffix = token.slice(-6)

  await db.insert(schema.proposalEvent).values({
    proposalSnapshotId: link.proposalSnapshotId,
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
    .from(schema.proposalAcceptance)
    .where(eq(schema.proposalAcceptance.publicLinkId, link.id))
    .orderBy(desc(schema.proposalAcceptance.acceptedAt))
    .limit(1)

  const accepted: ProposalAcceptanceRecord | null = acceptanceRow
    ? {
        id: acceptanceRow.id,
        proposalSnapshotId: acceptanceRow.proposalSnapshotId,
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
    snapshotId: link.proposalSnapshotId,
    document,
    accepted,
  }
}

export async function acceptPublicProposal(
  input: AcceptPublicProposalInput
): Promise<ProposalAcceptanceRecord> {
  const [link] = await db
    .select({
      id: schema.proposalPublicLink.id,
      proposalSnapshotId: schema.proposalPublicLink.proposalSnapshotId,
      status: schema.proposalPublicLink.status,
      revokedAt: schema.proposalPublicLink.revokedAt,
      expiresAt: schema.proposalPublicLink.expiresAt,
      proposalDraftId: schema.proposalSnapshot.proposalDraftId,
    })
    .from(schema.proposalPublicLink)
    .innerJoin(
      schema.proposalSnapshot,
      eq(
        schema.proposalSnapshot.id,
        schema.proposalPublicLink.proposalSnapshotId
      )
    )
    .where(eq(schema.proposalPublicLink.token, input.token))
    .limit(1)

  if (!link) {
    throw new Error("Proposal link not found")
  }

  if (link.status !== "active" || link.revokedAt !== null) {
    throw new Error("Proposal link is revoked or unavailable")
  }

  if (link.expiresAt !== null && link.expiresAt.getTime() <= Date.now()) {
    throw new Error("Proposal link has expired")
  }

  if (!input.agreedTerms) {
    throw new Error("Terms must be agreed to accept proposal")
  }

  const acceptance = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.proposalAcceptance)
      .values({
        proposalSnapshotId: link.proposalSnapshotId,
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
      throw new Error("Failed to insert proposal acceptance")
    }

    await tx.insert(schema.proposalEvent).values({
      proposalSnapshotId: link.proposalSnapshotId,
      publicLinkId: link.id,
      eventType: "signature.completed",
      metadata: {
        acceptanceId: row.id,
        timestamp: new Date().toISOString(),
        signerEmail: input.signerEmail,
      },
    })

    await tx
      .update(schema.proposalDraft)
      .set({
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(eq(schema.proposalDraft.id, link.proposalDraftId))

    return {
      id: row.id,
      proposalSnapshotId: row.proposalSnapshotId,
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
