import { and, db, desc, eq, ne, schema, sql } from "@workspace/database"
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

function toAcceptanceTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

export type GetPublicProposalMetaResult =
  | { status: "not_found" }
  | { status: "unavailable"; reason: "revoked" | "expired" }
  | {
      status: "ready"
      token: string
      title: string
      sellerName: string
      recipientEmail: string | null
    }

export type GetPublicProposalResult =
  | { status: "not_found" }
  | { status: "unavailable"; reason: "revoked" | "expired" }
  | { status: "forbidden"; error: string }
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

export async function getPublicProposalMeta(
  token: string
): Promise<GetPublicProposalMetaResult> {
  const [link] = await db
    .select({
      id: schema.proposalPublicLink.id,
      status: schema.proposalPublicLink.status,
      revokedAt: schema.proposalPublicLink.revokedAt,
      expiresAt: schema.proposalPublicLink.expiresAt,
      recipientEmail: schema.proposalPublicLink.recipientEmail,
      draftTitle: schema.proposalDraft.title,
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
    .innerJoin(
      schema.proposalDraft,
      eq(schema.proposalDraft.id, schema.proposalSnapshot.proposalDraftId)
    )
    .where(eq(schema.proposalPublicLink.token, token))
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

  const document = parseProposalDraft(link.document)
  return {
    status: "ready",
    token,
    title: link.draftTitle || document.data.title || "Proposal",
    sellerName: document.data.seller.name || "",
    recipientEmail: link.recipientEmail ?? null,
  }
}

export async function getPublicProposal(
  token: string,
  options: {
    sessionEmail: string
    userId?: string | null
    ipAddress?: string | null
    userAgent?: string | null
  }
): Promise<GetPublicProposalResult> {
  const [link] = await db
    .select({
      id: schema.proposalPublicLink.id,
      proposalSnapshotId: schema.proposalPublicLink.proposalSnapshotId,
      organizationId: schema.proposalPublicLink.organizationId,
      status: schema.proposalPublicLink.status,
      revokedAt: schema.proposalPublicLink.revokedAt,
      expiresAt: schema.proposalPublicLink.expiresAt,
      recipientEmail: schema.proposalPublicLink.recipientEmail,
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

  if (link.status === "revoked" || link.revokedAt !== null) {
    return { status: "unavailable", reason: "revoked" }
  }

  if (link.expiresAt !== null && link.expiresAt.getTime() <= Date.now()) {
    return { status: "unavailable", reason: "expired" }
  }

  const sessionEmail = options.sessionEmail.trim().toLowerCase()
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  let isMember = false
  if (options.userId && UUID_REGEX.test(options.userId)) {
    const [member] = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, link.organizationId),
          eq(schema.member.userId, options.userId)
        )
      )
      .limit(1)
    if (member) isMember = true
  }

  if (!isMember && sessionEmail) {
    const [member] = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(
        and(
          eq(schema.member.organizationId, link.organizationId),
          eq(schema.user.email, sessionEmail)
        )
      )
      .limit(1)
    if (member) isMember = true
  }

  if (!isMember) {
    if (link.recipientEmail) {
      if (link.recipientEmail.trim().toLowerCase() !== sessionEmail) {
        return {
          status: "forbidden",
          error: `This document was sent to ${link.recipientEmail}. You are currently verified as ${options.sessionEmail}.`,
        }
      }
    } else {
      // Bind link recipient email on first access by a client recipient
      await db
        .update(schema.proposalPublicLink)
        .set({ recipientEmail: sessionEmail })
        .where(eq(schema.proposalPublicLink.id, link.id))
    }
  }

  const document = parseProposalDraft(link.document)
  const tokenSuffix = token.slice(-6)

  await db.insert(schema.proposalEvent).values({
    proposalSnapshotId: link.proposalSnapshotId,
    publicLinkId: link.id,
    organizationId: link.organizationId,
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
        acceptedAt: toAcceptanceTimestamp(acceptanceRow.acceptedAt),
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
      organizationId: schema.proposalPublicLink.organizationId,
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

  if (link.status === "revoked" || link.revokedAt !== null) {
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
        organizationId: link.organizationId,
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
      organizationId: link.organizationId,
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
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(schema.proposalDraft.id, link.proposalDraftId),
          ne(schema.proposalDraft.status, "accepted")
        )
      )

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
      acceptedAt: toAcceptanceTimestamp(row.acceptedAt),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    }
  })

  return acceptance
}
