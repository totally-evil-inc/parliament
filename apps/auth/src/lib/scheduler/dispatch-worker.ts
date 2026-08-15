import { randomBytes } from "node:crypto"
import { and, db, desc, eq, lte } from "@workspace/database"
import {
  invoiceDraft,
  invoicePublicLink,
  invoiceSnapshot,
  proposalDraft,
  proposalPublicLink,
  proposalSnapshot,
  scheduledDocumentDispatch,
} from "@workspace/database/schema"
import {
  finalizeInvoiceDraft as buildInvoiceSnapshotPayload,
  finalizeProposalDraft as buildProposalSnapshotPayload,
} from "@workspace/document/finalize"
import { logger, logWideEvent } from "@workspace/logger"
import { renderEmail, sendEmail } from "../email"
import { sendGmailMessage } from "../gmail/send-service"

export interface ProcessDispatchesResult {
  processed: number
  successes: number
  failures: number
}

function createPublicToken() {
  return randomBytes(24).toString("base64url")
}

/**
 * Core engine that claims and processes pending scheduled document dispatches that are due.
 */
export async function processDueScheduledDispatches(options?: {
  dispatchId?: string
  forceNow?: boolean
}): Promise<ProcessDispatchesResult> {
  const startTime = Date.now()
  const gateUrl = (
    Bun.env.GATE_URL ||
    process.env.GATE_URL ||
    "http://localhost:4100"
  ).replace(/\/$/, "")
  const now = new Date()

  // 1. Query pending dispatches that are due (or target a specific dispatch if requested)
  const whereConditions = [eq(scheduledDocumentDispatch.status, "pending")]
  if (options?.dispatchId) {
    whereConditions.push(eq(scheduledDocumentDispatch.id, options.dispatchId))
  } else if (!options?.forceNow) {
    whereConditions.push(lte(scheduledDocumentDispatch.scheduledFor, now))
  }

  const dueDispatches = await db
    .select()
    .from(scheduledDocumentDispatch)
    .where(and(...whereConditions))
    .orderBy(scheduledDocumentDispatch.scheduledFor)
    .limit(10)

  if (dueDispatches.length === 0) {
    return { processed: 0, successes: 0, failures: 0 }
  }

  let successes = 0
  let failures = 0

  for (const dispatch of dueDispatches) {
    const dispatchStart = Date.now()
    try {
      // Optimistic claim: mark status as processing to prevent duplicate delivery by concurrent workers
      const [claimed] = await db
        .update(scheduledDocumentDispatch)
        .set({ status: "processing", updatedAt: new Date() })
        .where(
          and(
            eq(scheduledDocumentDispatch.id, dispatch.id),
            eq(scheduledDocumentDispatch.status, "pending")
          )
        )
        .returning()

      if (!claimed) {
        // Already claimed by another worker tick
        continue
      }

      let shareUrl = ""

      // 2. Ensure document snapshot & public client gate link exist
      if (dispatch.documentType === "proposal") {
        const [pDraft] = await db
          .select()
          .from(proposalDraft)
          .where(
            and(
              eq(proposalDraft.id, dispatch.documentId),
              eq(proposalDraft.organizationId, dispatch.organizationId)
            )
          )
          .limit(1)

        if (!pDraft) {
          throw new Error(`Proposal draft ${dispatch.documentId} not found`)
        }

        // Look for existing active public link
        const existingLinks = await db
          .select({
            token: proposalPublicLink.token,
          })
          .from(proposalSnapshot)
          .innerJoin(
            proposalPublicLink,
            eq(proposalPublicLink.proposalSnapshotId, proposalSnapshot.id)
          )
          .where(
            and(
              eq(proposalSnapshot.proposalDraftId, pDraft.id),
              eq(proposalPublicLink.status, "active")
            )
          )
          .orderBy(desc(proposalPublicLink.createdAt))
          .limit(1)

        let token = existingLinks[0]?.token

        if (!token) {
          // Finalize new snapshot and create public link
          const snapshotPayload = buildProposalSnapshotPayload(pDraft.document)
          token = createPublicToken()

          await db.transaction(async (tx) => {
            const [snap] = await tx
              .insert(proposalSnapshot)
              .values({
                proposalDraftId: pDraft.id,
                organizationId: dispatch.organizationId,
                document: snapshotPayload.document,
                contentHash: snapshotPayload.contentHash,
                templateId: snapshotPayload.templateId,
                templateVersion: snapshotPayload.templateVersion,
                calculationVersion: snapshotPayload.calculationVersion,
                createdByUserId: dispatch.userId,
              })
              .returning()

            if (!snap) throw new Error("Failed to create proposal snapshot")

            await tx.insert(proposalPublicLink).values({
              proposalSnapshotId: snap.id,
              organizationId: dispatch.organizationId,
              token: token!,
              status: "active",
              recipientEmail: dispatch.recipientEmail,
            })
          })
        }

        shareUrl = `${gateUrl}/p/${token}`
      } else if (dispatch.documentType === "invoice") {
        const [iDraft] = await db
          .select()
          .from(invoiceDraft)
          .where(
            and(
              eq(invoiceDraft.id, dispatch.documentId),
              eq(invoiceDraft.organizationId, dispatch.organizationId)
            )
          )
          .limit(1)

        if (!iDraft) {
          throw new Error(`Invoice draft ${dispatch.documentId} not found`)
        }

        const existingLinks = await db
          .select({
            token: invoicePublicLink.token,
          })
          .from(invoiceSnapshot)
          .innerJoin(
            invoicePublicLink,
            eq(invoicePublicLink.invoiceSnapshotId, invoiceSnapshot.id)
          )
          .where(
            and(
              eq(invoiceSnapshot.invoiceDraftId, iDraft.id),
              eq(invoicePublicLink.status, "active")
            )
          )
          .orderBy(desc(invoicePublicLink.createdAt))
          .limit(1)

        let token = existingLinks[0]?.token

        if (!token) {
          const snapshotPayload = buildInvoiceSnapshotPayload(iDraft.document)
          token = createPublicToken()

          await db.transaction(async (tx) => {
            const [snap] = await tx
              .insert(invoiceSnapshot)
              .values({
                invoiceDraftId: iDraft.id,
                organizationId: dispatch.organizationId,
                document: snapshotPayload.document,
                contentHash: snapshotPayload.contentHash,
                templateId: snapshotPayload.templateId,
                templateVersion: snapshotPayload.templateVersion,
                calculationVersion: snapshotPayload.calculationVersion,
                createdByUserId: dispatch.userId,
              })
              .returning()

            if (!snap) throw new Error("Failed to create invoice snapshot")

            await tx.insert(invoicePublicLink).values({
              invoiceSnapshotId: snap.id,
              organizationId: dispatch.organizationId,
              token: token!,
              status: "active",
              recipientEmail: dispatch.recipientEmail,
            })
          })
        }

        shareUrl = `${gateUrl}/i/${token}`
      } else {
        throw new Error(`Unsupported document type: ${dispatch.documentType}`)
      }

      // 3. Render email dispatch HTML template
      const htmlBody = await renderEmail("document-dispatch", {
        documentType: dispatch.documentType,
        documentTitle: dispatch.documentTitle,
        personalMessage: dispatch.message,
        shareUrl,
        recipientEmail: dispatch.recipientEmail,
      })

      // 4. Deliver email (Gmail API with fallback to SMTP/Resend)
      let sentVia = dispatch.sendMethod
      let deliverySuccess = false

      if (dispatch.sendMethod === "gmail") {
        try {
          await sendGmailMessage({
            userId: dispatch.userId,
            to: dispatch.recipientEmail,
            subject: dispatch.subject,
            htmlText: htmlBody,
          })
          deliverySuccess = true
        } catch (gmailErr: unknown) {
          logger.warn(
            { err: gmailErr, userId: dispatch.userId, dispatchId: dispatch.id },
            "Gmail delivery failed for scheduled dispatch; attempting SMTP fallback"
          )
          // Fallback to standard SMTP / Resend if configured
          try {
            await sendEmail({
              to: dispatch.recipientEmail,
              subject: dispatch.subject,
              html: htmlBody,
            })
            sentVia = "smtp_resend"
            deliverySuccess = true
          } catch (smtpErr: unknown) {
            throw new Error(
              `Gmail error: ${gmailErr instanceof Error ? gmailErr.message : String(gmailErr)}. Fallback SMTP error: ${smtpErr instanceof Error ? smtpErr.message : String(smtpErr)}`
            )
          }
        }
      } else {
        await sendEmail({
          to: dispatch.recipientEmail,
          subject: dispatch.subject,
          html: htmlBody,
        })
        deliverySuccess = true
      }

      if (!deliverySuccess) {
        throw new Error("Failed to dispatch email via all configured channels")
      }

      // 5. Update scheduled dispatch and document draft statuses to 'sent'
      const completedAt = new Date()
      await db.transaction(async (tx) => {
        await tx
          .update(scheduledDocumentDispatch)
          .set({
            status: "sent",
            sendMethod: sentVia,
            sentAt: completedAt,
            lastError: null,
            updatedAt: completedAt,
          })
          .where(eq(scheduledDocumentDispatch.id, dispatch.id))

        if (dispatch.documentType === "proposal") {
          await tx
            .update(proposalDraft)
            .set({ status: "sent", updatedAt: completedAt })
            .where(eq(proposalDraft.id, dispatch.documentId))
        } else if (dispatch.documentType === "invoice") {
          await tx
            .update(invoiceDraft)
            .set({ status: "sent", updatedAt: completedAt })
            .where(eq(invoiceDraft.id, dispatch.documentId))
        }
      })

      logWideEvent({
        event: "document.dispatch.executed",
        durationMs: Date.now() - dispatchStart,
        organizationId: dispatch.organizationId,
        userId: dispatch.userId,
        entityId: dispatch.id,
        outcome: "success",
        metadata: {
          documentType: dispatch.documentType,
          documentId: dispatch.documentId,
          recipientEmail: dispatch.recipientEmail,
          sendMethod: sentVia,
        },
      })

      successes++
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      const nextAttempts = dispatch.attempts + 1
      const isFinalFailure = nextAttempts >= 3

      logger.error(
        {
          err,
          dispatchId: dispatch.id,
          documentId: dispatch.documentId,
          attempts: nextAttempts,
        },
        "Failed to execute scheduled document dispatch"
      )

      await db
        .update(scheduledDocumentDispatch)
        .set({
          status: isFinalFailure ? "failed" : "pending",
          attempts: nextAttempts,
          lastError: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(scheduledDocumentDispatch.id, dispatch.id))

      logWideEvent({
        event: "document.dispatch.failed",
        durationMs: Date.now() - dispatchStart,
        organizationId: dispatch.organizationId,
        userId: dispatch.userId,
        entityId: dispatch.id,
        outcome: "failure",
        error: {
          code: "DISPATCH_FAILED",
          message: errorMsg,
        },
        metadata: {
          documentType: dispatch.documentType,
          documentId: dispatch.documentId,
          recipientEmail: dispatch.recipientEmail,
          attempts: nextAttempts,
          isFinalFailure,
        },
      })

      failures++
    }
  }

  logger.info(
    {
      processed: dueDispatches.length,
      successes,
      failures,
      durationMs: Date.now() - startTime,
    },
    "Completed scheduled dispatches processing cycle"
  )

  return {
    processed: dueDispatches.length,
    successes,
    failures,
  }
}
