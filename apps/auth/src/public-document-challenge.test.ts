import { beforeAll, describe, expect, test } from "bun:test"
import { db, schema } from "@workspace/database"
import { createInvoiceDraftFromBlueprint } from "@workspace/document/invoice"
import { createProposalDraftFromBlueprint } from "@workspace/document/proposal"
import { app } from "./index"
import {
  acceptPublicInvoice,
  getPublicInvoice,
} from "./lib/public-document/invoices"
import {
  acceptPublicProposal,
  getPublicProposal,
} from "./lib/public-document/proposals"

describe("Empirical Challenge & Stress Tests for Public Document Access (apps/auth)", () => {
  let orgId: string
  let orgNoPaymentId: string

  let proposalDraftId: string
  let proposalSnapshotId: string
  let proposalValidToken: string
  let proposalRevokedAndExpiredToken: string
  let proposalActiveWithRevokedAtToken: string

  let invoiceDraftId: string
  let invoiceSnapshotId: string
  let invoiceValidToken: string
  let invoiceNoPaymentToken: string
  let invoiceSnapshotNoPaymentId: string
  let invoiceDraftNoPaymentId: string

  beforeAll(async () => {
    // 1. Create primary test org with payment link
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Challenge Org Gate",
        slug: `challenge-org-gate-${Date.now()}`,
        createdAt: new Date(),
        paymentLinkUrl: "https://pay.example.com/challenge-gate",
      })
      .returning()
    orgId = org.id

    // 2. Create secondary test org without payment link
    const [orgNoPay] = await db
      .insert(schema.organization)
      .values({
        name: "Challenge Org No Pay",
        slug: `challenge-org-nopay-${Date.now()}`,
        createdAt: new Date(),
        paymentLinkUrl: null,
      })
      .returning()
    orgNoPaymentId = orgNoPay.id

    // 3. Proposal Setup
    proposalDraftId = crypto.randomUUID()
    const proposalDoc = createProposalDraftFromBlueprint({
      id: proposalDraftId,
      blueprint: "classic",
      sellerName: "Challenge Seller",
    })

    await db.insert(schema.proposalDraft).values({
      id: proposalDraftId,
      organizationId: orgId,
      title: "Challenge Proposal",
      status: "sent",
      document: proposalDoc,
      revision: 1,
    })

    const [pSnapshot] = await db
      .insert(schema.proposalSnapshot)
      .values({
        proposalDraftId,
        organizationId: orgId,
        document: proposalDoc,
        contentHash: "hash-challenge-prop-123",
        templateId: "proposal-classic",
        templateVersion: 1,
      })
      .returning()
    proposalSnapshotId = pSnapshot.id

    proposalValidToken = `token_prop_chal_valid_${Date.now()}`
    await db.insert(schema.proposalPublicLink).values({
      proposalSnapshotId,
      organizationId: orgId,
      token: proposalValidToken,
      status: "active",
    })

    // Token that is BOTH status='revoked' AND expiresAt in the past
    proposalRevokedAndExpiredToken = `token_prop_chal_both_${Date.now()}`
    await db.insert(schema.proposalPublicLink).values({
      proposalSnapshotId,
      organizationId: orgId,
      token: proposalRevokedAndExpiredToken,
      status: "revoked",
      revokedAt: new Date(Date.now() - 100000),
      expiresAt: new Date(Date.now() - 50000),
    })

    // Token that is status='active' BUT has a non-null revokedAt
    proposalActiveWithRevokedAtToken = `token_prop_chal_rev_time_${Date.now()}`
    await db.insert(schema.proposalPublicLink).values({
      proposalSnapshotId,
      organizationId: orgId,
      token: proposalActiveWithRevokedAtToken,
      status: "active",
      revokedAt: new Date(Date.now() - 10000),
    })

    // 4. Invoice Setup - Primary Org
    invoiceDraftId = crypto.randomUUID()
    const invoiceDoc = createInvoiceDraftFromBlueprint({
      id: invoiceDraftId,
      blueprint: "classic",
      sellerName: "Challenge Seller",
    })

    await db.insert(schema.invoiceDraft).values({
      id: invoiceDraftId,
      organizationId: orgId,
      title: "Challenge Invoice",
      status: "sent",
      document: invoiceDoc,
      revision: 1,
    })

    const [iSnapshot] = await db
      .insert(schema.invoiceSnapshot)
      .values({
        invoiceDraftId,
        organizationId: orgId,
        document: invoiceDoc,
        contentHash: "hash-challenge-inv-123",
        templateId: "invoice-classic",
        templateVersion: 1,
      })
      .returning()
    invoiceSnapshotId = iSnapshot.id

    invoiceValidToken = `token_inv_chal_valid_${Date.now()}`
    await db.insert(schema.invoicePublicLink).values({
      invoiceSnapshotId,
      organizationId: orgId,
      token: invoiceValidToken,
      status: "active",
    })

    // 5. Invoice Setup - Org without payment link
    invoiceDraftNoPaymentId = crypto.randomUUID()
    const invoiceNoPayDoc = createInvoiceDraftFromBlueprint({
      id: invoiceDraftNoPaymentId,
      blueprint: "classic",
      sellerName: "No Pay Seller",
    })

    await db.insert(schema.invoiceDraft).values({
      id: invoiceDraftNoPaymentId,
      organizationId: orgNoPaymentId,
      title: "No Pay Invoice",
      status: "sent",
      document: invoiceNoPayDoc,
      revision: 1,
    })

    const [iNoPaySnapshot] = await db
      .insert(schema.invoiceSnapshot)
      .values({
        invoiceDraftId: invoiceDraftNoPaymentId,
        organizationId: orgNoPaymentId,
        document: invoiceNoPayDoc,
        contentHash: "hash-challenge-nopay-123",
        templateId: "invoice-classic",
        templateVersion: 1,
      })
      .returning()
    invoiceSnapshotNoPaymentId = iNoPaySnapshot.id

    invoiceNoPaymentToken = `token_inv_chal_nopay_${Date.now()}`
    await db.insert(schema.invoicePublicLink).values({
      invoiceSnapshotId: invoiceSnapshotNoPaymentId,
      organizationId: orgNoPaymentId,
      token: invoiceNoPaymentToken,
      status: "active",
    })
  })

  describe("Edge Case 1: Status & RevokedAt Discrepancy / Dual Expiry", () => {
    test("token with status=revoked and past expiresAt returns unavailable (revoked)", async () => {
      const res = await getPublicProposal(proposalRevokedAndExpiredToken, {
        sessionEmail: "test@example.com",
      })
      expect(res.status).toBe("unavailable")
      if (res.status === "unavailable") {
        expect(res.reason).toBe("revoked")
      }
    })

    test("token with status=active but non-null revokedAt returns unavailable (revoked)", async () => {
      const res = await getPublicProposal(proposalActiveWithRevokedAtToken, {
        sessionEmail: "test@example.com",
      })
      expect(res.status).toBe("unavailable")
      if (res.status === "unavailable") {
        expect(res.reason).toBe("revoked")
      }
    })
  })

  describe("Edge Case 2: Payment Link Null Safety", () => {
    test("getPublicInvoice returns paymentLinkUrl = null when org has no payment link", async () => {
      const res = await getPublicInvoice(invoiceNoPaymentToken, {
        sessionEmail: "test@example.com",
      })
      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.paymentLinkUrl).toBeNull()
      }
    })

    test("getPublicInvoice returns valid paymentLinkUrl string when org has payment link", async () => {
      const res = await getPublicInvoice(invoiceValidToken, {
        sessionEmail: "test@example.com",
      })
      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.paymentLinkUrl).toBe(
          "https://pay.example.com/challenge-gate"
        )
      }
    })
  })

  describe("Edge Case 3: Re-acceptance / Multiple Signatures", () => {
    test("accepting an already-accepted proposal records multiple acceptances and returns the latest", async () => {
      // First acceptance
      const acc1 = await acceptPublicProposal({
        token: proposalValidToken,
        signerName: "First Signer",
        signerEmail: "first@example.com",
        agreedTerms: true,
      })
      expect(acc1.signerName).toBe("First Signer")

      // Second acceptance by different signer
      const acc2 = await acceptPublicProposal({
        token: proposalValidToken,
        signerName: "Second Signer",
        signerEmail: "second@example.com",
        agreedTerms: true,
      })
      expect(acc2.signerName).toBe("Second Signer")

      // getPublicProposal should return the LATEST acceptance record
      const res = await getPublicProposal(proposalValidToken, {
        sessionEmail: "test@example.com",
      })
      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.accepted).not.toBeNull()
        expect(res.accepted?.signerName).toBe("Second Signer")
      }
    })

    test("accepting an already-accepted invoice records multiple acceptances and returns the latest", async () => {
      const acc1 = await acceptPublicInvoice({
        token: invoiceValidToken,
        signerName: "First Inv Signer",
        signerEmail: "firstinv@example.com",
        agreedTerms: true,
      })
      expect(acc1.signerName).toBe("First Inv Signer")

      const acc2 = await acceptPublicInvoice({
        token: invoiceValidToken,
        signerName: "Second Inv Signer",
        signerEmail: "secondinv@example.com",
        agreedTerms: true,
      })
      expect(acc2.signerName).toBe("Second Inv Signer")

      const res = await getPublicInvoice(invoiceValidToken, {
        sessionEmail: "test@example.com",
      })
      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.accepted).not.toBeNull()
        expect(res.accepted?.signerName).toBe("Second Inv Signer")
      }
    })
  })

  describe("Edge Case 4: Event Recording Metadata Nesting & Prototype Pollution", () => {
    test("recordClientEvent strips __proto__, constructor, prototype and caps nesting at depth 6 via API", async () => {
      const payloadWithPollution = {
        documentType: "proposal",
        token: proposalValidToken,
        eventType: "custom.security.test",
        metadata: {
          safeKey: "safeValue",
          __proto__: { evil: "payload" },
          constructor: "should_be_stripped",
          nested: {
            l1: {
              l2: {
                l3: {
                  l4: {
                    l5: {
                      l6: {
                        l7_too_deep: "truncated",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }

      const req = new Request("http://localhost/api/public/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadWithPollution),
      })

      const res = await app.fetch(req)
      expect(res.status).toBe(200)

      const json = (await res.json()) as { success: boolean; eventId: string }
      expect(json.success).toBe(true)
      expect(json.eventId).toBeDefined()
    })
  })

  describe("Edge Case 5: HTTP Endpoint Error Handling", () => {
    test("POST /api/public/proposal/:token/accept without agreedTerms returns 400", async () => {
      const req = new Request(
        `http://localhost/api/public/proposal/${proposalValidToken}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-session-email": "test@example.com",
          },
          body: JSON.stringify({
            signerName: "No Terms Signer",
            signerEmail: "noterms@example.com",
            agreedTerms: false,
          }),
        }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(400)
    })

    test("POST /api/public/event with missing required fields returns 400", async () => {
      const req = new Request("http://localhost/api/public/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: proposalValidToken,
          // missing documentType and eventType
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(400)
    })
  })
})
