import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { db, eq, schema } from "@workspace/database"
import { createInvoiceDraftFromBlueprint } from "@workspace/document/invoice"
import { createProposalDraftFromBlueprint } from "@workspace/document/proposal"
import { finalizeInvoiceSend, finalizeProposalSend } from "../document-send"

describe("Document Send Finalize (Phase 4)", () => {
  let orgId: string
  let userId: string
  let proposalDraftId: string
  let invoiceDraftId: string

  beforeAll(async () => {
    const now = new Date()
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Document Send Test Org",
        slug: `doc-send-org-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    orgId = org.id

    const [user] = await db
      .insert(schema.user)
      .values({
        id: crypto.randomUUID(),
        name: "Doc Sender",
        email: `doc-sender-${crypto.randomUUID()}@test.local`,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    userId = user.id

    proposalDraftId = crypto.randomUUID()
    const propDoc = createProposalDraftFromBlueprint({
      id: proposalDraftId,
      blueprint: "classic",
      sellerName: "Test Seller",
    })
    await db.insert(schema.proposalDraft).values({
      id: proposalDraftId,
      organizationId: orgId,
      createdByUserId: userId,
      title: "Design Retainer Proposal",
      status: "draft",
      document: propDoc,
      revision: propDoc.revision,
    })

    invoiceDraftId = crypto.randomUUID()
    const invDoc = createInvoiceDraftFromBlueprint({
      id: invoiceDraftId,
      blueprint: "classic",
      sellerName: "Test Seller",
    })
    await db.insert(schema.invoiceDraft).values({
      id: invoiceDraftId,
      organizationId: orgId,
      createdByUserId: userId,
      title: "Invoice #1001",
      status: "draft",
      document: invDoc,
      revision: invDoc.revision,
    })
  })

  afterAll(async () => {
    if (orgId) {
      await db
        .delete(schema.proposalPublicLink)
        .where(eq(schema.proposalPublicLink.organizationId, orgId))
      await db
        .delete(schema.proposalSnapshot)
        .where(eq(schema.proposalSnapshot.organizationId, orgId))
      await db
        .delete(schema.proposalDraft)
        .where(eq(schema.proposalDraft.organizationId, orgId))

      await db
        .delete(schema.invoicePublicLink)
        .where(eq(schema.invoicePublicLink.organizationId, orgId))
      await db
        .delete(schema.invoiceSnapshot)
        .where(eq(schema.invoiceSnapshot.organizationId, orgId))
      await db
        .delete(schema.invoiceDraft)
        .where(eq(schema.invoiceDraft.organizationId, orgId))

      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgId))
    }
    if (userId) {
      await db.delete(schema.user).where(eq(schema.user.id, userId))
    }
  })

  test("finalizeProposalSend updates status to sent and creates snapshot + public link", async () => {
    const res = await finalizeProposalSend(
      proposalDraftId,
      orgId,
      userId,
      "client@acme.test"
    )

    expect(res.shareUrl).toContain("/p/")
    expect(res.documentType).toBe("proposal")
    expect(res.recipientEmail).toBe("client@acme.test")

    const [draft] = await db
      .select({ status: schema.proposalDraft.status })
      .from(schema.proposalDraft)
      .where(eq(schema.proposalDraft.id, proposalDraftId))
    expect(draft.status).toBe("sent")

    const [link] = await db
      .select()
      .from(schema.proposalPublicLink)
      .where(eq(schema.proposalPublicLink.token, res.token))
    expect(link).toBeDefined()
    expect(link.status).toBe("active")
  })

  test("finalizeInvoiceSend updates status to sent and creates snapshot + public link", async () => {
    const res = await finalizeInvoiceSend(
      invoiceDraftId,
      orgId,
      userId,
      "billing@acme.test"
    )

    expect(res.shareUrl).toContain("/i/")
    expect(res.documentType).toBe("invoice")
    expect(res.recipientEmail).toBe("billing@acme.test")

    const [draft] = await db
      .select({ status: schema.invoiceDraft.status })
      .from(schema.invoiceDraft)
      .where(eq(schema.invoiceDraft.id, invoiceDraftId))
    expect(draft.status).toBe("sent")

    const [link] = await db
      .select()
      .from(schema.invoicePublicLink)
      .where(eq(schema.invoicePublicLink.token, res.token))
    expect(link).toBeDefined()
    expect(link.status).toBe("active")
  })
})
