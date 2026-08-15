import { createServerFn } from "@tanstack/react-start"
import { and, db, desc, eq, inArray, schema } from "@workspace/database"
import { logWideEvent } from "@workspace/logger"
import { z } from "zod"
import { getUserId, requireActiveOrganization, requireAuth } from "./auth"

const AUTH_SERVER_URL =
  process.env.VITE_BETTER_AUTH_URL ||
  process.env.AUTH_SERVER_URL ||
  "http://localhost:4000"

export const scheduleDispatchInputSchema = z.object({
  documentType: z.enum(["proposal", "invoice"]),
  documentId: z.string().uuid(),
  documentTitle: z.string().trim().min(1, "Document title is required"),
  recipientEmail: z.string().trim().email("Valid recipient email is required"),
  ccRecipients: z.array(z.string().trim().email()).optional().default([]),
  bccRecipients: z.array(z.string().trim().email()).optional().default([]),
  subject: z.string().trim().min(1, "Subject is required"),
  message: z.string().trim().min(1, "Message is required"),
  scheduledFor: z
    .string()
    .datetime()
    .refine((val) => new Date(val).getTime() > Date.now(), {
      message: "Scheduled time must be in the future",
    }),
  sendMethod: z.enum(["gmail", "smtp_resend"]).default("gmail"),
})

export const updateScheduleInputSchema = z.object({
  id: z.string().uuid(),
  recipientEmail: z.string().trim().email().optional(),
  ccRecipients: z.array(z.string().trim().email()).optional(),
  bccRecipients: z.array(z.string().trim().email()).optional(),
  subject: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).optional(),
  scheduledFor: z
    .string()
    .datetime()
    .refine((val) => new Date(val).getTime() > Date.now(), {
      message: "Scheduled time must be in the future",
    })
    .optional(),
})

export const cancelScheduleInputSchema = z.object({
  id: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  documentType: z.enum(["proposal", "invoice"]).optional(),
})

export const sendNowInputSchema = z.object({
  id: z.string().uuid(),
})

export type ScheduledDispatchItem = {
  id: string
  organizationId: string
  userId: string
  documentType: "proposal" | "invoice"
  documentId: string
  documentTitle: string
  recipientEmail: string
  ccRecipients: string[]
  bccRecipients: string[]
  subject: string
  message: string
  scheduledFor: string
  status: "pending" | "processing" | "sent" | "cancelled" | "failed"
  sendMethod: "gmail" | "smtp_resend"
  lastError: string | null
  attempts: number
  sentAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

function serializeDispatch(
  row: typeof schema.scheduledDocumentDispatch.$inferSelect
): ScheduledDispatchItem {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    documentType: row.documentType as "proposal" | "invoice",
    documentId: row.documentId,
    documentTitle: row.documentTitle,
    recipientEmail: row.recipientEmail,
    ccRecipients: Array.isArray(row.ccRecipients) ? row.ccRecipients : [],
    bccRecipients: Array.isArray(row.bccRecipients) ? row.bccRecipients : [],
    subject: row.subject,
    message: row.message,
    scheduledFor: row.scheduledFor.toISOString(),
    status: row.status as ScheduledDispatchItem["status"],
    sendMethod: row.sendMethod as ScheduledDispatchItem["sendMethod"],
    lastError: row.lastError,
    attempts: row.attempts,
    sentAt: row.sentAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Schedule a document email dispatch
 */
export const scheduleDocumentDispatch = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(scheduleDispatchInputSchema)
  .handler(async ({ context, data }): Promise<ScheduledDispatchItem> => {
    const startTime = Date.now()
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = getUserId(context.auth)
    if (!userId) throw new Error("Unauthorized")

    // Verify document exists
    if (data.documentType === "proposal") {
      const [draft] = await db
        .select({ id: schema.proposalDraft.id })
        .from(schema.proposalDraft)
        .where(
          and(
            eq(schema.proposalDraft.id, data.documentId),
            eq(schema.proposalDraft.organizationId, organizationId)
          )
        )
        .limit(1)
      if (!draft) throw new Error("Proposal draft not found")
    } else {
      const [draft] = await db
        .select({ id: schema.invoiceDraft.id })
        .from(schema.invoiceDraft)
        .where(
          and(
            eq(schema.invoiceDraft.id, data.documentId),
            eq(schema.invoiceDraft.organizationId, organizationId)
          )
        )
        .limit(1)
      if (!draft) throw new Error("Invoice draft not found")
    }

    const scheduledDate = new Date(data.scheduledFor)

    const result = await db.transaction(async (tx) => {
      // Cancel any previous pending dispatch for this document
      await tx
        .update(schema.scheduledDocumentDispatch)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.scheduledDocumentDispatch.documentId, data.documentId),
            eq(schema.scheduledDocumentDispatch.organizationId, organizationId),
            eq(schema.scheduledDocumentDispatch.status, "pending")
          )
        )

      // Insert new scheduled dispatch record
      const [row] = await tx
        .insert(schema.scheduledDocumentDispatch)
        .values({
          organizationId,
          userId,
          documentType: data.documentType,
          documentId: data.documentId,
          documentTitle: data.documentTitle,
          recipientEmail: data.recipientEmail,
          ccRecipients: data.ccRecipients,
          bccRecipients: data.bccRecipients,
          subject: data.subject,
          message: data.message,
          scheduledFor: scheduledDate,
          status: "pending",
          sendMethod: data.sendMethod,
          attempts: 0,
        })
        .returning()

      if (!row) throw new Error("Failed to persist scheduled dispatch")

      // Update document draft status to 'scheduled'
      if (data.documentType === "proposal") {
        await tx
          .update(schema.proposalDraft)
          .set({ status: "scheduled", updatedAt: new Date() })
          .where(eq(schema.proposalDraft.id, data.documentId))
      } else {
        await tx
          .update(schema.invoiceDraft)
          .set({ status: "scheduled", updatedAt: new Date() })
          .where(eq(schema.invoiceDraft.id, data.documentId))
      }

      return serializeDispatch(row)
    })

    logWideEvent({
      event: "document.dispatch.scheduled",
      durationMs: Date.now() - startTime,
      organizationId,
      userId,
      entityId: result.id,
      outcome: "success",
      metadata: {
        documentType: data.documentType,
        documentId: data.documentId,
        recipientEmail: data.recipientEmail,
        scheduledFor: data.scheduledFor,
      },
    })

    return result
  })

/**
 * Retrieve active/pending scheduled dispatch for a specific document
 */
export const getScheduledDispatchForDocument = createServerFn({
  method: "GET",
})
  .middleware([requireAuth])
  .validator(
    z.object({
      documentId: z.string().uuid(),
      documentType: z.enum(["proposal", "invoice"]).optional(),
    })
  )
  .handler(async ({ context, data }): Promise<ScheduledDispatchItem | null> => {
    const organizationId = await requireActiveOrganization(context.auth)

    const [row] = await db
      .select()
      .from(schema.scheduledDocumentDispatch)
      .where(
        and(
          eq(schema.scheduledDocumentDispatch.documentId, data.documentId),
          eq(schema.scheduledDocumentDispatch.organizationId, organizationId),
          inArray(schema.scheduledDocumentDispatch.status, [
            "pending",
            "processing",
          ])
        )
      )
      .orderBy(desc(schema.scheduledDocumentDispatch.createdAt))
      .limit(1)

    return row ? serializeDispatch(row) : null
  })

/**
 * List all scheduled dispatches for active workspace
 */
export const listScheduledDispatches = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<ScheduledDispatchItem[]> => {
    const organizationId = await requireActiveOrganization(context.auth)

    const rows = await db
      .select()
      .from(schema.scheduledDocumentDispatch)
      .where(
        eq(schema.scheduledDocumentDispatch.organizationId, organizationId)
      )
      .orderBy(desc(schema.scheduledDocumentDispatch.scheduledFor))

    return rows.map(serializeDispatch)
  })

/**
 * Update an existing pending scheduled dispatch
 */
export const updateScheduledDispatch = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(updateScheduleInputSchema)
  .handler(async ({ context, data }): Promise<ScheduledDispatchItem> => {
    const organizationId = await requireActiveOrganization(context.auth)

    const [existing] = await db
      .select()
      .from(schema.scheduledDocumentDispatch)
      .where(
        and(
          eq(schema.scheduledDocumentDispatch.id, data.id),
          eq(schema.scheduledDocumentDispatch.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!existing) throw new Error("Scheduled dispatch not found")
    if (existing.status !== "pending") {
      throw new Error(
        `Cannot edit scheduled dispatch in '${existing.status}' status`
      )
    }

    const updates: Partial<
      typeof schema.scheduledDocumentDispatch.$inferInsert
    > = {
      updatedAt: new Date(),
    }
    if (data.recipientEmail) updates.recipientEmail = data.recipientEmail
    if (data.ccRecipients) updates.ccRecipients = data.ccRecipients
    if (data.bccRecipients) updates.bccRecipients = data.bccRecipients
    if (data.subject) updates.subject = data.subject
    if (data.message) updates.message = data.message
    if (data.scheduledFor) updates.scheduledFor = new Date(data.scheduledFor)

    const [updated] = await db
      .update(schema.scheduledDocumentDispatch)
      .set(updates)
      .where(eq(schema.scheduledDocumentDispatch.id, data.id))
      .returning()

    if (!updated) throw new Error("Failed to update scheduled dispatch")
    return serializeDispatch(updated)
  })

/**
 * Cancel a pending scheduled dispatch and revert document status to draft
 */
export const cancelScheduledDispatch = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(cancelScheduleInputSchema)
  .handler(async ({ context, data }): Promise<{ success: boolean }> => {
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = getUserId(context.auth)

    let targetDispatch:
      | typeof schema.scheduledDocumentDispatch.$inferSelect
      | undefined

    if (data.id) {
      const [row] = await db
        .select()
        .from(schema.scheduledDocumentDispatch)
        .where(
          and(
            eq(schema.scheduledDocumentDispatch.id, data.id),
            eq(schema.scheduledDocumentDispatch.organizationId, organizationId)
          )
        )
        .limit(1)
      targetDispatch = row
    } else if (data.documentId) {
      const [row] = await db
        .select()
        .from(schema.scheduledDocumentDispatch)
        .where(
          and(
            eq(schema.scheduledDocumentDispatch.documentId, data.documentId),
            eq(schema.scheduledDocumentDispatch.organizationId, organizationId),
            eq(schema.scheduledDocumentDispatch.status, "pending")
          )
        )
        .orderBy(desc(schema.scheduledDocumentDispatch.createdAt))
        .limit(1)
      targetDispatch = row
    }

    if (!targetDispatch) {
      throw new Error("No active scheduled dispatch found")
    }

    await db.transaction(async (tx) => {
      await tx
        .update(schema.scheduledDocumentDispatch)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.scheduledDocumentDispatch.id, targetDispatch!.id))

      // Revert document draft status back to 'draft'
      if (targetDispatch!.documentType === "proposal") {
        await tx
          .update(schema.proposalDraft)
          .set({ status: "draft", updatedAt: new Date() })
          .where(eq(schema.proposalDraft.id, targetDispatch!.documentId))
      } else {
        await tx
          .update(schema.invoiceDraft)
          .set({ status: "draft", updatedAt: new Date() })
          .where(eq(schema.invoiceDraft.id, targetDispatch!.documentId))
      }
    })

    logWideEvent({
      event: "document.dispatch.cancelled",
      organizationId,
      userId: userId ?? undefined,
      entityId: targetDispatch.id,
      outcome: "success",
      metadata: {
        documentType: targetDispatch.documentType,
        documentId: targetDispatch.documentId,
      },
    })

    return { success: true }
  })

/**
 * Trigger immediate execution of a scheduled dispatch ("Send Now")
 */
export const sendScheduledDispatchNow = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(sendNowInputSchema)
  .handler(
    async ({
      context,
      data,
    }): Promise<{ success: boolean; message: string }> => {
      const organizationId = await requireActiveOrganization(context.auth)

      const [dispatch] = await db
        .select()
        .from(schema.scheduledDocumentDispatch)
        .where(
          and(
            eq(schema.scheduledDocumentDispatch.id, data.id),
            eq(schema.scheduledDocumentDispatch.organizationId, organizationId)
          )
        )
        .limit(1)

      if (!dispatch) throw new Error("Scheduled dispatch not found")
      if (dispatch.status !== "pending" && dispatch.status !== "failed") {
        throw new Error(
          `Cannot send dispatch currently in '${dispatch.status}' status`
        )
      }

      // Trigger the auth server scheduler tick endpoint with dispatchId and forceNow
      const userEmail =
        typeof context.auth.user.email === "string"
          ? context.auth.user.email
          : ""

      const res = await fetch(`${AUTH_SERVER_URL}/api/scheduler/tick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-session-email": userEmail,
          "x-test-user-id": dispatch.userId,
          "x-test-org-id": organizationId,
        },
        body: JSON.stringify({
          dispatchId: dispatch.id,
          forceNow: true,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(
          errorData.error || "Failed to trigger immediate email dispatch"
        )
      }

      return {
        success: true,
        message: `Dispatched ${dispatch.documentType} email to ${dispatch.recipientEmail}`,
      }
    }
  )
