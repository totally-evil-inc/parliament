import { createHash, randomBytes, randomUUID } from "node:crypto"
import { createServerFn } from "@tanstack/react-start"
import {
  and,
  count,
  db,
  desc,
  eq,
  inArray,
  schema,
  sql,
} from "@workspace/database"
import { calculateProposalPricing } from "@workspace/document/calculate"
import { finalizeProposalDraft as buildSnapshotPayload } from "@workspace/document/finalize"
import { createProposalDraftFromBlueprint } from "@workspace/document/proposal"
import { safeParseProposalDraft } from "@workspace/document/schema"
import { stripHtml } from "@workspace/document/text"
import { logWideEvent } from "@workspace/logger"
import { z } from "zod"
import type { JsonValue } from "./api-client"
import { requireAuth } from "./auth"
import type { AuthenticatedCommandAuthContext } from "./auth-context"

const proposalIdSchema = z.object({ id: z.string().uuid() })
const createProposalDraftSchema = z.object({
  blueprint: z.enum(["web-design", "classic"]).default("classic"),
})
const saveProposalDraftSchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  document: z.unknown(),
})
const finalizeProposalDraftSchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  recipientEmail: z.string().trim().email().optional(),
})
const publicTokenSchema = z.object({ token: z.string().min(16) })
const acceptPublicProposalSchema = publicTokenSchema.extend({
  signerName: z.string().trim().min(1),
  signerEmail: z.string().trim().email(),
  signatureText: z.string().trim().optional(),
  agreedTerms: z.boolean().refine((value) => value === true),
})

export type ProposalDraftListItem = {
  id: string
  title: string
  status: string
  revision: number
  createdAt: string
  updatedAt: string
  viewCount: number
  lastViewedAt: string | null
  acceptedAt: string | null
  publicToken: string | null
  customerName: string
  issueDate: string
  validUntil: string | null
  valueMinor: number
  currency: string
}

export type PersistedProposalDraft = {
  id: string
  title: string
  status: string
  revision: number
  document: JsonValue
  createdAt: string
  updatedAt: string
}

export type SaveProposalDraftResult =
  | { status: "saved"; draft: PersistedProposalDraft }
  | {
      status: "conflict"
      draft: PersistedProposalDraft
    }

export type FinalizeProposalDraftResult = {
  snapshotId: string
  token: string
  draft: PersistedProposalDraft
}

export type PublicProposalResult =
  | { status: "not_found" }
  | { status: "unavailable"; reason: "revoked" | "expired" }
  | {
      status: "ready"
      token: string
      tokenSuffix: string
      snapshotId: string
      document: JsonValue
      accepted: PublicAcceptance | null
    }

export type PublicAcceptance = {
  id: string
  signerName: string
  signerEmail: string
  signatureText: string | null
  acceptedAt: string
}

export const listProposalDrafts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const auth = context.auth
    const organizationId = await requireActiveOrganization(auth)
    const rows = await db
      .select()
      .from(schema.proposalDraft)
      .where(eq(schema.proposalDraft.organizationId, organizationId))
      .orderBy(desc(schema.proposalDraft.updatedAt))

    return await Promise.all(
      rows.map(async (row): Promise<ProposalDraftListItem> => {
        const latestLink = await db
          .select({
            token: schema.proposalPublicLink.token,
          })
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
        let currency = "KES"
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
  })

export const getProposalDraft = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator(proposalIdSchema)
  .handler(async ({ context, data }) => {
    const organizationId = await requireActiveOrganization(context.auth)
    const draft = await selectDraft(data.id, organizationId)
    if (!draft) throw new Error("Proposal draft not found")
    return draft
  })

export const createProposalDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(createProposalDraftSchema)
  .handler(async ({ context, data }) => {
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = getUserId(context.auth)
    const id = randomUUID()
    const document = createProposalDraftFromBlueprint({
      id,
      blueprint: data.blueprint,
      sellerName:
        typeof context.auth.user.name === "string"
          ? context.auth.user.name
          : "",
    })
    const [row] = await db
      .insert(schema.proposalDraft)
      .values({
        id,
        organizationId,
        createdByUserId: userId,
        title: document.data.title || "Untitled proposal",
        status: "draft",
        document,
        revision: document.revision,
      })
      .returning()

    if (!row) throw new Error("Failed to create proposal draft")
    return serializeDraft(row)
  })

export const saveProposalDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(saveProposalDraftSchema)
  .handler(async ({ context, data }): Promise<SaveProposalDraftResult> => {
    const startTime = Date.now()
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = getUserId(context.auth)
    const current = await selectDraft(data.id, organizationId)
    if (!current) throw new Error("Proposal draft not found")
    if (current.revision !== data.revision) {
      return { status: "conflict", draft: current }
    }

    const parsed = safeParseProposalDraft(data.document)
    if (!parsed.success || parsed.data.id !== data.id) {
      throw new Error("Invalid proposal document")
    }
    const nextRevision = current.revision + 1
    const document = {
      ...parsed.data,
      revision: nextRevision,
      updatedAt: new Date().toISOString(),
    }

    let subtotalMinor = 0
    let taxMinor = 0
    let totalMinor = 0
    let currency = "USD"
    if (parsed.data.data.pricing) {
      try {
        const calc = calculateProposalPricing(parsed.data.data.pricing)
        subtotalMinor = calc.subtotalMinor
        taxMinor = calc.taxMinor
        totalMinor = calc.totalMinor
        currency = parsed.data.data.pricing.currency
      } catch (_e) {
        // ignore
      }
    }

    const contentHash = createHash("sha256")
      .update(JSON.stringify(parsed.data.composition.blocks))
      .digest("hex")

    const resultRow = await db.transaction(async (tx) => {
      await tx
        .insert(schema.proposal)
        .values({
          id: data.id,
          organizationId,
          title: stripHtml(document.data.title) || "Untitled proposal",
          status: "draft",
          currency,
          subtotalMinorUnits: subtotalMinor,
          taxMinorUnits: taxMinor,
          totalMinorUnits: totalMinor,
          createdById: userId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.proposal.id],
          set: {
            title: stripHtml(document.data.title) || "Untitled proposal",
            currency,
            subtotalMinorUnits: subtotalMinor,
            taxMinorUnits: taxMinor,
            totalMinorUnits: totalMinor,
            updatedAt: new Date(),
          },
        })

      await tx.insert(schema.proposalVersion).values({
        proposalId: data.id,
        organizationId,
        versionNumber: nextRevision,
        content: parsed.data.composition.blocks,
        proposalDraft: document,
        hash: contentHash,
        createdById: userId,
      })

      const [row] = await tx
        .update(schema.proposalDraft)
        .set({
          title: stripHtml(document.data.title) || "Untitled proposal",
          document,
          revision: nextRevision,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.proposalDraft.id, data.id),
            eq(schema.proposalDraft.organizationId, organizationId)
          )
        )
        .returning()

      if (!row) throw new Error("Failed to save proposal draft")
      return row
    })

    logWideEvent({
      event: "document.proposal.saved",
      durationMs: Date.now() - startTime,
      organizationId,
      userId: userId ?? undefined,
      entityId: data.id,
      outcome: "success",
      metadata: {
        revision: nextRevision,
        totalMinorUnits: totalMinor,
        currency,
      },
    })

    return { status: "saved", draft: serializeDraft(resultRow) }
  })

export const saveProposalServerFn = saveProposalDraft
export const getProposalServerFn = getProposalDraft
export const listProposalsServerFn = listProposalDrafts


export const finalizeProposalDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(finalizeProposalDraftSchema)
  .handler(async ({ context, data }): Promise<FinalizeProposalDraftResult> => {
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = getUserId(context.auth)
    const current = await selectDraft(data.id, organizationId)
    if (!current) throw new Error("Proposal draft not found")
    if (current.revision !== data.revision) {
      throw new Error(
        "Proposal draft has changed. Save or reload before sending."
      )
    }

    const snapshotPayload = buildSnapshotPayload(current.document)
    const token = createPublicToken()
    const result = await db.transaction(async (tx) => {
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

      const parsedDoc = safeParseProposalDraft(current.document)
      const recipientEmail =
        data.recipientEmail ||
        (parsedDoc.success ? parsedDoc.data.data.customer?.email : null) ||
        null

      await tx.insert(schema.proposalPublicLink).values({
        proposalSnapshotId: snapshot.id,
        organizationId,
        token,
        status: "active",
        recipientEmail,
      })

      const [draft] = await tx
        .update(schema.proposalDraft)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(schema.proposalDraft.id, current.id))
        .returning()
      if (!draft) throw new Error("Failed to update proposal status")

      return { snapshotId: snapshot.id, draft: serializeDraft(draft) }
    })

    return { ...result, token }
  })

export const getPublicProposal = createServerFn({ method: "GET" })
  .validator(publicTokenSchema)
  .handler(async ({ data }): Promise<PublicProposalResult> => {
    const link = await findPublicLink(data.token)
    if (!link) return { status: "not_found" }
    if (link.status !== "active" || link.revokedAt) {
      return { status: "unavailable", reason: "revoked" }
    }
    if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
      return { status: "unavailable", reason: "expired" }
    }

    await db.insert(schema.proposalEvent).values({
      proposalSnapshotId: link.snapshotId,
      publicLinkId: link.id,
      eventType: "opened",
      metadata: { tokenSuffix: data.token.slice(-6) },
    })

    return {
      status: "ready",
      token: data.token,
      tokenSuffix: data.token.slice(-6),
      snapshotId: link.snapshotId,
      document: toJsonValue(link.document),
      accepted: await getLatestAcceptance(link.id),
    }
  })

export const acceptPublicProposal = createServerFn({ method: "POST" })
  .validator(acceptPublicProposalSchema)
  .handler(async ({ data }) => {
    const link = await findPublicLink(data.token)
    if (!link) throw new Error("Proposal link not found")
    if (link.status !== "active" || link.revokedAt) {
      throw new Error("Proposal link is unavailable")
    }
    if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
      throw new Error("Proposal link has expired")
    }

    const acceptance = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.proposalAcceptance)
        .values({
          proposalSnapshotId: link.snapshotId,
          publicLinkId: link.id,
          signerName: data.signerName,
          signerEmail: data.signerEmail,
          signatureText: data.signatureText || null,
          agreedTerms: data.agreedTerms,
          ipAddress: null,
          userAgent: null,
        })
        .returning()
      if (!row) throw new Error("Failed to accept proposal")

      await tx.insert(schema.proposalEvent).values({
        proposalSnapshotId: link.snapshotId,
        publicLinkId: link.id,
        eventType: "accepted",
        metadata: { acceptanceId: row.id },
      })
      await tx
        .update(schema.proposalDraft)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(schema.proposalDraft.id, link.proposalDraftId))

      return serializeAcceptance(row)
    })

    return { accepted: acceptance }
  })

async function requireActiveOrganization(
  auth: AuthenticatedCommandAuthContext
) {
  const organizationId = auth.session.session?.activeOrganizationId
  const userId = getUserId(auth)
  if (!organizationId || !userId) throw new Error("Unauthorized")

  const rows = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.userId, userId)
      )
    )
    .limit(1)

  if (rows.length === 0) throw new Error("Unauthorized")
  return organizationId
}

function getUserId(auth: AuthenticatedCommandAuthContext) {
  return typeof auth.user.id === "string" ? auth.user.id : null
}

async function selectDraft(id: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(schema.proposalDraft)
    .where(
      and(
        eq(schema.proposalDraft.id, id),
        eq(schema.proposalDraft.organizationId, organizationId)
      )
    )
    .limit(1)
  return row ? serializeDraft(row) : null
}

async function findPublicLink(token: string) {
  const [row] = await db
    .select({
      id: schema.proposalPublicLink.id,
      status: schema.proposalPublicLink.status,
      revokedAt: schema.proposalPublicLink.revokedAt,
      expiresAt: schema.proposalPublicLink.expiresAt,
      snapshotId: schema.proposalSnapshot.id,
      proposalDraftId: schema.proposalSnapshot.proposalDraftId,
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

  if (!row) return null
  const parsed = safeParseProposalDraft(row.document)
  if (!parsed.success) throw new Error("Proposal snapshot is invalid")
  return { ...row, document: parsed.data }
}

async function getLatestAcceptance(publicLinkId: string) {
  const [row] = await db
    .select()
    .from(schema.proposalAcceptance)
    .where(eq(schema.proposalAcceptance.publicLinkId, publicLinkId))
    .orderBy(desc(schema.proposalAcceptance.acceptedAt))
    .limit(1)

  return row ? serializeAcceptance(row) : null
}

function serializeDraft(row: typeof schema.proposalDraft.$inferSelect) {
  const parsed = safeParseProposalDraft(row.document)
  if (!parsed.success) throw new Error("Proposal draft is invalid")
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    revision: row.revision,
    document: toJsonValue(parsed.data),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function serializeAcceptance(
  row: typeof schema.proposalAcceptance.$inferSelect
) {
  return {
    id: row.id,
    signerName: row.signerName,
    signerEmail: row.signerEmail,
    signatureText: row.signatureText,
    acceptedAt:
      row.acceptedAt instanceof Date
        ? row.acceptedAt.toISOString()
        : String(row.acceptedAt),
  }
}

function createPublicToken() {
  return randomBytes(24).toString("base64url")
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

export const deleteProposalDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const organizationId = await requireActiveOrganization(context.auth)

    await db.transaction(async (tx) => {
      const snapshots = await tx
        .select({ id: schema.proposalSnapshot.id })
        .from(schema.proposalSnapshot)
        .where(eq(schema.proposalSnapshot.proposalDraftId, data.id))

      const snapshotIds = snapshots.map((s) => s.id)

      if (snapshotIds.length > 0) {
        await tx
          .delete(schema.proposalEvent)
          .where(inArray(schema.proposalEvent.proposalSnapshotId, snapshotIds))

        await tx
          .delete(schema.proposalAcceptance)
          .where(
            inArray(schema.proposalAcceptance.proposalSnapshotId, snapshotIds)
          )

        await tx
          .delete(schema.proposalPublicLink)
          .where(
            inArray(schema.proposalPublicLink.proposalSnapshotId, snapshotIds)
          )

        await tx
          .delete(schema.proposalSnapshot)
          .where(eq(schema.proposalSnapshot.proposalDraftId, data.id))
      }

      await tx
        .delete(schema.proposalDraft)
        .where(
          and(
            eq(schema.proposalDraft.id, data.id),
            eq(schema.proposalDraft.organizationId, organizationId)
          )
        )
    })

    return { success: true }
  })
