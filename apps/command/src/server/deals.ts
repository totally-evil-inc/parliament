import { randomUUID } from "node:crypto"
import { createServerFn } from "@tanstack/react-start"
import {
  and,
  db,
  desc,
  eq,
  schema,
} from "@workspace/database"
import { createProposalDraftFromBlueprint } from "@workspace/document/proposal"
import {
  createDealInputSchema,
  updateDealStageInputSchema,
} from "@workspace/document/schema"
import { logWideEvent } from "@workspace/logger"
import { z } from "zod"
import { requireActiveOrganization } from "./auth"
import { requireAuth } from "./auth"

const dealIdSchema = z.object({ id: z.string().uuid() })

export const listDealsServerFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const organizationId = await requireActiveOrganization(context.auth)
    const rows = await db
      .select({
        id: schema.deal.id,
        organizationId: schema.deal.organizationId,
        companyId: schema.deal.companyId,
        contactId: schema.deal.contactId,
        proposalId: schema.deal.proposalId,
        title: schema.deal.title,
        stage: schema.deal.stage,
        valueMinorUnits: schema.deal.valueMinorUnits,
        currency: schema.deal.currency,
        expectedCloseDate: schema.deal.expectedCloseDate,
        createdAt: schema.deal.createdAt,
        updatedAt: schema.deal.updatedAt,
        companyName: schema.company.name,
        contactEmail: schema.contact.email,
      })
      .from(schema.deal)
      .leftJoin(schema.company, eq(schema.company.id, schema.deal.companyId))
      .leftJoin(schema.contact, eq(schema.contact.id, schema.deal.contactId))
      .where(eq(schema.deal.organizationId, organizationId))
      .orderBy(desc(schema.deal.updatedAt))

    return rows
  })

export const createDealServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(createDealInputSchema)
  .handler(async ({ context, data }) => {
    const startTime = Date.now()
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = context.auth.user?.id
    const id = randomUUID()

    const [newDeal] = await db
      .insert(schema.deal)
      .values({
        id,
        organizationId,
        companyId: data.companyId ?? null,
        contactId: data.contactId ?? null,
        title: data.title,
        stage: data.stage,
        valueMinorUnits: data.valueMinorUnits,
        currency: data.currency,
        expectedCloseDate: data.expectedCloseDate ?? null,
        createdById: userId ?? null,
      })
      .returning()

    if (!newDeal) {
      throw new Error("Failed to create deal")
    }

    logWideEvent({
      event: "client.deal.created",
      durationMs: Date.now() - startTime,
      organizationId,
      userId: userId ?? undefined,
      entityId: id,
      outcome: "success",
      metadata: {
        stage: data.stage,
        valueMinorUnits: data.valueMinorUnits,
        currency: data.currency,
      },
    })

    return newDeal
  })

export const updateDealStageServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(updateDealStageInputSchema)
  .handler(async ({ context, data }) => {
    const startTime = Date.now()
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = context.auth.user?.id

    const [updatedDeal] = await db
      .update(schema.deal)
      .set({
        stage: data.stage,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.deal.id, data.id),
          eq(schema.deal.organizationId, organizationId)
        )
      )
      .returning()

    if (!updatedDeal) {
      throw new Error("Deal not found or unauthorized")
    }

    logWideEvent({
      event: "client.deal.stage_updated",
      durationMs: Date.now() - startTime,
      organizationId,
      userId: userId ?? undefined,
      entityId: data.id,
      outcome: "success",
      metadata: {
        newStage: data.stage,
      },
    })

    return updatedDeal
  })

export const convertDealToProposalServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(dealIdSchema)
  .handler(async ({ context, data }) => {
    const startTime = Date.now()
    const organizationId = await requireActiveOrganization(context.auth)
    const userId = context.auth.user?.id

    // 1. Fetch deal with optional company and contact details
    const [dealRow] = await db
      .select({
        id: schema.deal.id,
        title: schema.deal.title,
        valueMinorUnits: schema.deal.valueMinorUnits,
        currency: schema.deal.currency,
        companyId: schema.deal.companyId,
        contactId: schema.deal.contactId,
        companyName: schema.company.name,
        contactEmail: schema.contact.email,
        contactFirstName: schema.contact.firstName,
        contactLastName: schema.contact.lastName,
      })
      .from(schema.deal)
      .leftJoin(schema.company, eq(schema.company.id, schema.deal.companyId))
      .leftJoin(schema.contact, eq(schema.contact.id, schema.deal.contactId))
      .where(
        and(
          eq(schema.deal.id, data.id),
          eq(schema.deal.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!dealRow) {
      throw new Error("Deal not found")
    }

    const proposalId = randomUUID()
    const sellerName =
      typeof context.auth.user.name === "string" ? context.auth.user.name : ""

    const draftDoc = createProposalDraftFromBlueprint({
      id: proposalId,
      blueprint: "classic",
      sellerName,
    })

    // Pre-populate customer metadata from linked account / contact
    if (dealRow.companyName) {
      draftDoc.data.customer.name = dealRow.companyName
    }
    if (dealRow.contactEmail) {
      draftDoc.data.customer.email = dealRow.contactEmail
    }
    if (dealRow.title) {
      draftDoc.data.title = `Proposal for ${dealRow.title}`
    }

    const result = await db.transaction(async (tx) => {
      // Create baseline proposal row
      const [newProposal] = await tx
        .insert(schema.proposal)
        .values({
          id: proposalId,
          organizationId,
          companyId: dealRow.companyId,
          contactId: dealRow.contactId,
          title: draftDoc.data.title,
          status: "draft",
          currency: dealRow.currency,
          subtotalMinorUnits: dealRow.valueMinorUnits,
          totalMinorUnits: dealRow.valueMinorUnits,
          createdById: userId ?? null,
        })
        .returning()

      // Insert version 1 snapshot
      await tx.insert(schema.proposalVersion).values({
        proposalId,
        organizationId,
        versionNumber: 1,
        content: draftDoc.composition.blocks,
        proposalDraft: draftDoc,
        hash: "initial-deal-conversion",
        createdById: userId ?? null,
      })

      // Insert legacy draft row for editor backwards compatibility
      await tx.insert(schema.proposalDraft).values({
        id: proposalId,
        organizationId,
        createdByUserId: userId ?? null,
        title: draftDoc.data.title,
        status: "draft",
        document: draftDoc,
        revision: 1,
      })

      // Link proposal to deal and advance stage to proposal_sent
      await tx
        .update(schema.deal)
        .set({
          proposalId,
          stage: "proposal_sent",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.deal.id, data.id),
            eq(schema.deal.organizationId, organizationId)
          )
        )

      return newProposal
    })

    logWideEvent({
      event: "client.deal.proposal_created",
      durationMs: Date.now() - startTime,
      organizationId,
      userId: userId ?? undefined,
      entityId: data.id,
      outcome: "success",
      metadata: {
        proposalId,
        newStage: "proposal_sent",
      },
    })

    return { proposalId, proposal: result }
  })
