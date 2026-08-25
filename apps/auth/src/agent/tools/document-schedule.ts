import { toolDefinition } from "@tanstack/ai"
import {
  cancelScheduledDispatchInput,
  cancelScheduledDispatchOutput,
  isUuid,
  listScheduledDispatchesInput,
  listScheduledDispatchesOutput,
  scheduleDocumentSendInput,
  scheduleDocumentSendOutput,
} from "@workspace/agent"
import { and, db, desc, eq, schema, sql } from "@workspace/database"
import { logWideEvent } from "@workspace/logger"
import type { AgentContext } from "../tool-ctx"
import { escapeLikePattern } from "./sql-utils"

export function scheduleDocumentSendTool(ctx: AgentContext) {
  return toolDefinition({
    name: "schedule_document_send",
    description:
      "Schedule a proposal or invoice to be sent automatically at a future timestamp via email with a public client gate link.",
    inputSchema: scheduleDocumentSendInput,
    outputSchema: scheduleDocumentSendOutput,
    needsApproval: true,
  }).server(async (args) => {
    try {
      const scheduledForDate = new Date(args.scheduledFor)
      if (Number.isNaN(scheduledForDate.getTime())) {
        return {
          error: {
            code: "validation" as const,
            message: "Invalid scheduledFor timestamp.",
          },
        }
      }

      if (scheduledForDate.getTime() <= Date.now()) {
        return {
          error: {
            code: "validation" as const,
            message: "Scheduled time must be in the future.",
          },
        }
      }

      let documentTitle = ""
      let finalDocumentId = args.documentId
      const validUuid = isUuid(args.documentId)

      if (args.documentType === "proposal") {
        let doc: { id: string; title: string } | undefined
        if (validUuid) {
          const [found] = await db
            .select({
              id: schema.proposalDraft.id,
              title: schema.proposalDraft.title,
            })
            .from(schema.proposalDraft)
            .where(
              and(
                eq(schema.proposalDraft.id, args.documentId.trim()),
                eq(schema.proposalDraft.organizationId, ctx.organizationId)
              )
            )
            .limit(1)
          doc = found
        } else if (args.documentId) {
          const escaped = escapeLikePattern(args.documentId)
          const [found] = await db
            .select({
              id: schema.proposalDraft.id,
              title: schema.proposalDraft.title,
            })
            .from(schema.proposalDraft)
            .where(
              and(
                eq(schema.proposalDraft.organizationId, ctx.organizationId),
                sql`lower(${schema.proposalDraft.title}) LIKE lower(${`%${escaped}%`})`
              )
            )
            .limit(1)
          doc = found
        }

        if (!doc) {
          return {
            error: {
              code: "not_found" as const,
              message: `Proposal draft "${args.documentId}" not found in this organization.`,
            },
          }
        }
        documentTitle = doc.title
        finalDocumentId = doc.id
      } else if (args.documentType === "invoice") {
        let doc: { id: string; title: string } | undefined
        if (validUuid) {
          const [found] = await db
            .select({
              id: schema.invoiceDraft.id,
              title: schema.invoiceDraft.title,
            })
            .from(schema.invoiceDraft)
            .where(
              and(
                eq(schema.invoiceDraft.id, args.documentId.trim()),
                eq(schema.invoiceDraft.organizationId, ctx.organizationId)
              )
            )
            .limit(1)
          doc = found
        } else if (args.documentId) {
          const escaped = escapeLikePattern(args.documentId)
          const [found] = await db
            .select({
              id: schema.invoiceDraft.id,
              title: schema.invoiceDraft.title,
            })
            .from(schema.invoiceDraft)
            .where(
              and(
                eq(schema.invoiceDraft.organizationId, ctx.organizationId),
                sql`lower(${schema.invoiceDraft.title}) LIKE lower(${`%${escaped}%`})`
              )
            )
            .limit(1)
          doc = found
        }

        if (!doc) {
          return {
            error: {
              code: "not_found" as const,
              message: `Invoice draft "${args.documentId}" not found in this organization.`,
            },
          }
        }
        documentTitle = doc.title
        finalDocumentId = doc.id
      }

      const subject =
        args.subject ||
        `${args.documentType === "proposal" ? "Proposal" : "Invoice"}: ${documentTitle} from ${ctx.orgName}`

      const dispatchId = crypto.randomUUID()

      await db.insert(schema.scheduledDocumentDispatch).values({
        id: dispatchId,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        documentType: args.documentType,
        documentId: finalDocumentId,
        documentTitle,
        recipientEmail: args.recipientEmail,
        subject,
        message: args.personalMessage || "",
        scheduledFor: scheduledForDate,
        status: "pending",
        sendMethod: "gmail",
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      logWideEvent({
        event: "document.dispatch.scheduled",
        outcome: "success",
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        entityId: dispatchId,
        metadata: {
          documentType: args.documentType,
          documentId: finalDocumentId,
          recipientEmail: args.recipientEmail,
          scheduledFor: scheduledForDate.toISOString(),
        },
      })

      return {
        id: dispatchId,
        documentType: args.documentType,
        documentId: finalDocumentId,
        recipientEmail: args.recipientEmail,
        scheduledFor: scheduledForDate.toISOString(),
        status: "pending" as const,
        subject,
      }
    } catch (err: unknown) {
      return {
        error: {
          code: "internal" as const,
          message:
            err instanceof Error
              ? err.message
              : "Failed to schedule document dispatch",
        },
      }
    }
  })
}

export function listScheduledDispatchesTool(ctx: AgentContext) {
  return toolDefinition({
    name: "list_scheduled_dispatches",
    description:
      "List pending and completed scheduled document dispatches for the active organization or a specific document.",
    inputSchema: listScheduledDispatchesInput,
    outputSchema: listScheduledDispatchesOutput,
    needsApproval: false,
  }).server(async (args) => {
    try {
      const conditions = [
        eq(schema.scheduledDocumentDispatch.organizationId, ctx.organizationId),
      ]

      if (args.documentId) {
        conditions.push(
          eq(schema.scheduledDocumentDispatch.documentId, args.documentId)
        )
      }
      if (args.status) {
        conditions.push(
          eq(schema.scheduledDocumentDispatch.status, args.status)
        )
      }

      const rows = await db
        .select()
        .from(schema.scheduledDocumentDispatch)
        .where(and(...conditions))
        .orderBy(desc(schema.scheduledDocumentDispatch.scheduledFor))
        .limit(50)

      return {
        dispatches: rows.map((r) => ({
          id: r.id,
          documentType: r.documentType as "proposal" | "invoice",
          documentId: r.documentId,
          recipientEmail: r.recipientEmail,
          scheduledFor: r.scheduledFor.toISOString(),
          status: r.status,
          subject: r.subject,
          createdAt: r.createdAt.toISOString(),
        })),
      }
    } catch (err: unknown) {
      return {
        error: {
          code: "internal" as const,
          message:
            err instanceof Error
              ? err.message
              : "Failed to list scheduled dispatches",
        },
      }
    }
  })
}

export function cancelScheduledDispatchTool(ctx: AgentContext) {
  return toolDefinition({
    name: "cancel_scheduled_dispatch",
    description:
      "Cancel a pending scheduled document dispatch before it is sent.",
    inputSchema: cancelScheduledDispatchInput,
    outputSchema: cancelScheduledDispatchOutput,
    needsApproval: true,
  }).server(async (args) => {
    try {
      const conditions = [
        eq(schema.scheduledDocumentDispatch.organizationId, ctx.organizationId),
        eq(schema.scheduledDocumentDispatch.status, "pending"),
      ]

      if (args.id) {
        conditions.push(eq(schema.scheduledDocumentDispatch.id, args.id))
      } else if (args.documentId) {
        conditions.push(
          eq(schema.scheduledDocumentDispatch.documentId, args.documentId)
        )
      } else {
        return {
          error: {
            code: "validation" as const,
            message: "Must provide either dispatch id or documentId to cancel.",
          },
        }
      }

      const [target] = await db
        .select()
        .from(schema.scheduledDocumentDispatch)
        .where(and(...conditions))
        .limit(1)

      if (!target) {
        return {
          error: {
            code: "not_found" as const,
            message: "No pending scheduled dispatch found matching criteria.",
          },
        }
      }

      const now = new Date()
      await db
        .update(schema.scheduledDocumentDispatch)
        .set({
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
        })
        .where(eq(schema.scheduledDocumentDispatch.id, target.id))

      logWideEvent({
        event: "document.dispatch.cancelled",
        outcome: "success",
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        entityId: target.id,
        metadata: {
          documentType: target.documentType,
          documentId: target.documentId,
        },
      })

      return {
        id: target.id,
        status: "cancelled" as const,
        cancelledAt: now.toISOString(),
      }
    } catch (err: unknown) {
      return {
        error: {
          code: "internal" as const,
          message:
            err instanceof Error
              ? err.message
              : "Failed to cancel scheduled dispatch",
        },
      }
    }
  })
}
