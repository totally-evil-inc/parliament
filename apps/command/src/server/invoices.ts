import { randomBytes, randomUUID } from "node:crypto"
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
import { calculateInvoicePricing } from "@workspace/document/calculate"
import { finalizeInvoiceDraft as buildSnapshotPayload } from "@workspace/document/finalize"
import { createInvoiceDraftFromBlueprint } from "@workspace/document/invoice"
import { safeParseInvoiceDraft } from "@workspace/document/schema"
import { z } from "zod"
import type { JsonValue } from "./api-client"
import { requireAuth } from "./auth"
import type { AuthenticatedCommandAuthContext } from "./auth-context"

const invoiceIdSchema = z.object({ id: z.string().uuid() })
const createInvoiceDraftSchema = z.object({
  blueprint: z.enum(["standard", "classic"]).default("classic"),
})
const saveInvoiceDraftSchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  document: z.unknown(),
})
const finalizeInvoiceDraftSchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int().nonnegative(),
})
const publicTokenSchema = z.object({ token: z.string().min(16) })

export type InvoiceDraftListItem = {
  id: string
  title: string
  status: string
  revision: number
  createdAt: string
  updatedAt: string
  viewCount: number
  lastViewedAt: string | null
  publicToken: string | null
  customerName: string
  issueDate: string
  dueDate: string
  valueMinor: number
  currency: string
  invoiceNumber: string
}

export type PersistedInvoiceDraft = {
  id: string
  title: string
  status: string
  revision: number
  document: JsonValue
  createdAt: string
  updatedAt: string
}

export type SaveInvoiceDraftResult =
  | { status: "saved"; draft: PersistedInvoiceDraft }
  | {
      status: "conflict"
      draft: PersistedInvoiceDraft
    }

export type FinalizeInvoiceDraftResult = {
  snapshotId: string
  token: string
  draft: PersistedInvoiceDraft
}

export type PublicInvoiceResult =
  | { status: "not_found" }
  | { status: "unavailable"; reason: "revoked" | "expired" }
  | {
      status: "ready"
      token: string
      tokenSuffix: string
      snapshotId: string
      document: JsonValue
    }

export const listInvoiceDrafts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const auth = context.auth
    const organizationId = await requireActiveOrganization(auth)
    const rows = await db
      .select()
      .from(schema.invoiceDraft)
      .where(eq(schema.invoiceDraft.organizationId, organizationId))
      .orderBy(desc(schema.invoiceDraft.updatedAt))

    return await Promise.all(
      rows.map(async (row): Promise<InvoiceDraftListItem> => {
        const latestLink = await db
          .select({
            token: schema.invoicePublicLink.token,
          })
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
        let currency = "KES"
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
  })

export const getInvoiceDraft = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator(invoiceIdSchema)
  .handler(async ({ context, data }) => {
    const organizationId = await requireActiveOrganization(context.auth)
    const draft = await selectDraft(data.id, organizationId)
    if (!draft) throw new Error("Invoice draft not found")
    return draft
  })

export const createInvoiceDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(createInvoiceDraftSchema)
  .handler(async ({ context, data }) => {
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = getUserId(context.auth)
    const id = randomUUID()
    const document = createInvoiceDraftFromBlueprint({
      id,
      blueprint: data.blueprint,
      sellerName:
        typeof context.auth.user.name === "string"
          ? context.auth.user.name
          : "",
    })
    const [row] = await db
      .insert(schema.invoiceDraft)
      .values({
        id,
        organizationId,
        createdByUserId: userId,
        title: document.data.title || "Untitled invoice",
        status: "draft",
        document,
        revision: document.revision,
      })
      .returning()

    if (!row) throw new Error("Failed to create invoice draft")
    return serializeDraft(row)
  })

export const saveInvoiceDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(saveInvoiceDraftSchema)
  .handler(async ({ context, data }): Promise<SaveInvoiceDraftResult> => {
    const organizationId = await requireActiveOrganization(context.auth)
    const current = await selectDraft(data.id, organizationId)
    if (!current) throw new Error("Invoice draft not found")
    if (current.revision !== data.revision) {
      return { status: "conflict", draft: current }
    }

    const parsed = safeParseInvoiceDraft(data.document)
    if (!parsed.success || parsed.data.id !== data.id) {
      throw new Error("Invalid invoice document")
    }
    const nextRevision = current.revision + 1
    const document = {
      ...parsed.data,
      revision: nextRevision,
      updatedAt: new Date().toISOString(),
    }
    const [row] = await db
      .update(schema.invoiceDraft)
      .set({
        title: document.data.title || "Untitled invoice",
        document,
        revision: nextRevision,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.invoiceDraft.id, data.id),
          eq(schema.invoiceDraft.organizationId, organizationId)
        )
      )
      .returning()

    if (!row) throw new Error("Failed to save invoice draft")
    return { status: "saved", draft: serializeDraft(row) }
  })

export const finalizeInvoiceDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(finalizeInvoiceDraftSchema)
  .handler(async ({ context, data }): Promise<FinalizeInvoiceDraftResult> => {
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = getUserId(context.auth)
    const current = await selectDraft(data.id, organizationId)
    if (!current) throw new Error("Invoice draft not found")
    if (current.revision !== data.revision) {
      throw new Error(
        "Invoice draft has changed. Save or reload before sending."
      )
    }

    const snapshotPayload = buildSnapshotPayload(current.document)
    const token = createPublicToken()
    const result = await db.transaction(async (tx) => {
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
      })

      const [draft] = await tx
        .update(schema.invoiceDraft)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(schema.invoiceDraft.id, current.id))
        .returning()
      if (!draft) throw new Error("Failed to update invoice status")

      return { snapshotId: snapshot.id, draft: serializeDraft(draft) }
    })

    return { ...result, token }
  })

export const getPublicInvoice = createServerFn({ method: "GET" })
  .inputValidator(publicTokenSchema)
  .handler(async ({ data }): Promise<PublicInvoiceResult> => {
    const link = await findPublicLink(data.token)
    if (!link) return { status: "not_found" }
    if (link.status !== "active" || link.revokedAt) {
      return { status: "unavailable", reason: "revoked" }
    }
    if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
      return { status: "unavailable", reason: "expired" }
    }

    await db.insert(schema.invoiceEvent).values({
      invoiceSnapshotId: link.snapshotId,
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
    }
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
    .from(schema.invoiceDraft)
    .where(
      and(
        eq(schema.invoiceDraft.id, id),
        eq(schema.invoiceDraft.organizationId, organizationId)
      )
    )
    .limit(1)
  return row ? serializeDraft(row) : null
}

async function findPublicLink(token: string) {
  const [row] = await db
    .select({
      id: schema.invoicePublicLink.id,
      status: schema.invoicePublicLink.status,
      revokedAt: schema.invoicePublicLink.revokedAt,
      expiresAt: schema.invoicePublicLink.expiresAt,
      snapshotId: schema.invoiceSnapshot.id,
      invoiceDraftId: schema.invoiceSnapshot.invoiceDraftId,
      document: schema.invoiceSnapshot.document,
    })
    .from(schema.invoicePublicLink)
    .innerJoin(
      schema.invoiceSnapshot,
      eq(schema.invoiceSnapshot.id, schema.invoicePublicLink.invoiceSnapshotId)
    )
    .where(eq(schema.invoicePublicLink.token, token))
    .limit(1)

  if (!row) return null
  const parsed = safeParseInvoiceDraft(row.document)
  if (!parsed.success) throw new Error("Invoice snapshot is invalid")
  return { ...row, document: parsed.data }
}

function serializeDraft(row: typeof schema.invoiceDraft.$inferSelect) {
  const parsed = safeParseInvoiceDraft(row.document)
  if (!parsed.success) throw new Error("Invoice draft is invalid")
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

function createPublicToken() {
  return randomBytes(24).toString("base64url")
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

export const deleteInvoiceDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const organizationId = await requireActiveOrganization(context.auth)

    await db.transaction(async (tx) => {
      const snapshots = await tx
        .select({ id: schema.invoiceSnapshot.id })
        .from(schema.invoiceSnapshot)
        .where(eq(schema.invoiceSnapshot.invoiceDraftId, data.id))

      const snapshotIds = snapshots.map((s) => s.id)

      if (snapshotIds.length > 0) {
        await tx
          .delete(schema.invoiceEvent)
          .where(inArray(schema.invoiceEvent.invoiceSnapshotId, snapshotIds))

        await tx
          .delete(schema.invoicePublicLink)
          .where(
            inArray(schema.invoicePublicLink.invoiceSnapshotId, snapshotIds)
          )

        await tx
          .delete(schema.invoiceSnapshot)
          .where(eq(schema.invoiceSnapshot.invoiceDraftId, data.id))
      }

      await tx
        .delete(schema.invoiceDraft)
        .where(
          and(
            eq(schema.invoiceDraft.id, data.id),
            eq(schema.invoiceDraft.organizationId, organizationId)
          )
        )
    })

    return { success: true }
  })
