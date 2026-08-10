import { and, db, eq, schema } from "@workspace/database"
import type { DealStage } from "@workspace/document/schema"
import { logWideEvent } from "@workspace/logger"

export interface CalComAttendee {
  email: string
  name?: string
}

export interface CalComWebhookPayload {
  triggerEvent: "BOOKING_CREATED" | "BOOKING_CANCELLED" | string
  payload?: {
    bookingId?: number | string
    title?: string
    attendees?: CalComAttendee[]
    organizer?: {
      email?: string
    }
  }
}

export async function processCalComWebhook(
  payload: CalComWebhookPayload,
  organizationId: string
) {
  const startTime = Date.now()
  const { triggerEvent, payload: eventData } = payload

  if (!eventData || !eventData.attendees || eventData.attendees.length === 0) {
    return { status: "ignored", reason: "missing attendee data" }
  }

  const attendeeEmail = eventData.attendees[0].email

  // Find contact linked to attendee email
  const [contactRow] = await db
    .select({ id: schema.contact.id, companyId: schema.contact.companyId })
    .from(schema.contact)
    .where(
      and(
        eq(schema.contact.organizationId, organizationId),
        eq(schema.contact.email, attendeeEmail)
      )
    )
    .limit(1)

  const contactId = contactRow?.id

  if (triggerEvent === "BOOKING_CREATED") {
    let dealToUpdate = null

    if (contactId) {
      ;[dealToUpdate] = await db
        .select({ id: schema.deal.id, stage: schema.deal.stage })
        .from(schema.deal)
        .where(
          and(
            eq(schema.deal.organizationId, organizationId),
            eq(schema.deal.contactId, contactId),
            eq(schema.deal.stage, "lead")
          )
        )
        .limit(1)
    }

    if (!dealToUpdate) {
      ;[dealToUpdate] = await db
        .select({ id: schema.deal.id, stage: schema.deal.stage })
        .from(schema.deal)
        .where(
          and(
            eq(schema.deal.organizationId, organizationId),
            eq(schema.deal.stage, "lead")
          )
        )
        .limit(1)
    }

    if (dealToUpdate) {
      await db
        .update(schema.deal)
        .set({ stage: "discovery", updatedAt: new Date() })
        .where(eq(schema.deal.id, dealToUpdate.id))

      logWideEvent({
        event: "client.deal.booking_created",
        durationMs: Date.now() - startTime,
        organizationId,
        entityId: dealToUpdate.id,
        outcome: "success",
        metadata: {
          previousStage: "lead",
          newStage: "discovery",
          attendeeEmail,
        },
      })

      return { status: "updated", dealId: dealToUpdate.id, newStage: "discovery" }
    }

    return { status: "no_matching_deal" }
  }

  if (triggerEvent === "BOOKING_CANCELLED") {
    let dealToRollback = null

    if (contactId) {
      ;[dealToRollback] = await db
        .select({ id: schema.deal.id, stage: schema.deal.stage })
        .from(schema.deal)
        .where(
          and(
            eq(schema.deal.organizationId, organizationId),
            eq(schema.deal.contactId, contactId),
            eq(schema.deal.stage, "discovery")
          )
        )
        .limit(1)
    }

    if (!dealToRollback) {
      ;[dealToRollback] = await db
        .select({ id: schema.deal.id, stage: schema.deal.stage })
        .from(schema.deal)
        .where(
          and(
            eq(schema.deal.organizationId, organizationId),
            eq(schema.deal.stage, "discovery")
          )
        )
        .limit(1)
    }

    if (dealToRollback) {
      await db
        .update(schema.deal)
        .set({ stage: "lead", updatedAt: new Date() })
        .where(eq(schema.deal.id, dealToRollback.id))

      logWideEvent({
        event: "client.deal.stage_rolled_back",
        durationMs: Date.now() - startTime,
        organizationId,
        entityId: dealToRollback.id,
        outcome: "success",
        metadata: {
          previousStage: "discovery",
          newStage: "lead",
          reason: "cal_com_booking_cancelled",
          attendeeEmail,
        },
      })

      return { status: "rolled_back", dealId: dealToRollback.id, newStage: "lead" }
    }

    return { status: "no_matching_deal" }
  }

  return { status: "ignored", reason: "unsupported event" }
}
