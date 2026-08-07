import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { db, eq, schema } from "@workspace/database"
import { createInvoiceDraftFromBlueprint } from "@workspace/document/invoice"
import { createProposalDraftFromBlueprint } from "@workspace/document/proposal"
import { app } from "../index"
import { getPublicInvoice } from "./invoices"
import { sendOtp, verifyOtp } from "./otp"
import { acceptPublicProposal, getPublicProposal } from "./proposals"

describe("Milestone 3 Empirical Challenge & Stress Tests (apps/gate)", () => {
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

    // Token that is status='active' BUT revokedAt is not null
    proposalActiveWithRevokedAtToken = `token_prop_chal_active_rev_${Date.now()}`
    await db.insert(schema.proposalPublicLink).values({
      proposalSnapshotId,
      organizationId: orgId,
      token: proposalActiveWithRevokedAtToken,
      status: "active",
      revokedAt: new Date(),
    })

    // 4. Invoice Setup
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

    // Invoice setup for Org without paymentLinkUrl
    invoiceDraftNoPaymentId = crypto.randomUUID()
    await db.insert(schema.invoiceDraft).values({
      id: invoiceDraftNoPaymentId,
      organizationId: orgNoPaymentId,
      title: "Invoice No Payment",
      status: "sent",
      document: invoiceDoc,
      revision: 1,
    })

    const [iSnapshotNoPay] = await db
      .insert(schema.invoiceSnapshot)
      .values({
        invoiceDraftId: invoiceDraftNoPaymentId,
        organizationId: orgNoPaymentId,
        document: invoiceDoc,
        contentHash: "hash-challenge-inv-nopay-123",
        templateId: "invoice-classic",
        templateVersion: 1,
      })
      .returning()
    invoiceSnapshotNoPaymentId = iSnapshotNoPay.id

    invoiceNoPaymentToken = `token_inv_nopay_${Date.now()}`
    await db.insert(schema.invoicePublicLink).values({
      invoiceSnapshotId: invoiceSnapshotNoPaymentId,
      organizationId: orgNoPaymentId,
      token: invoiceNoPaymentToken,
      status: "active",
    })
  })

  afterAll(async () => {
    // Cleanup
    if (proposalSnapshotId) {
      await db
        .delete(schema.proposalEvent)
        .where(eq(schema.proposalEvent.proposalSnapshotId, proposalSnapshotId))
      await db
        .delete(schema.proposalAcceptance)
        .where(
          eq(schema.proposalAcceptance.proposalSnapshotId, proposalSnapshotId)
        )
      await db
        .delete(schema.proposalPublicLink)
        .where(
          eq(schema.proposalPublicLink.proposalSnapshotId, proposalSnapshotId)
        )
      await db
        .delete(schema.proposalSnapshot)
        .where(eq(schema.proposalSnapshot.id, proposalSnapshotId))
      await db
        .delete(schema.proposalDraft)
        .where(eq(schema.proposalDraft.id, proposalDraftId))
    }

    if (invoiceSnapshotId) {
      await db
        .delete(schema.invoiceEvent)
        .where(eq(schema.invoiceEvent.invoiceSnapshotId, invoiceSnapshotId))
      await db
        .delete(schema.invoiceAcceptance)
        .where(
          eq(schema.invoiceAcceptance.invoiceSnapshotId, invoiceSnapshotId)
        )
      await db
        .delete(schema.invoicePublicLink)
        .where(
          eq(schema.invoicePublicLink.invoiceSnapshotId, invoiceSnapshotId)
        )
      await db
        .delete(schema.invoiceSnapshot)
        .where(eq(schema.invoiceSnapshot.id, invoiceSnapshotId))
      await db
        .delete(schema.invoiceDraft)
        .where(eq(schema.invoiceDraft.id, invoiceDraftId))
    }

    if (invoiceSnapshotNoPaymentId) {
      await db
        .delete(schema.invoiceEvent)
        .where(
          eq(schema.invoiceEvent.invoiceSnapshotId, invoiceSnapshotNoPaymentId)
        )
      await db
        .delete(schema.invoiceAcceptance)
        .where(
          eq(
            schema.invoiceAcceptance.invoiceSnapshotId,
            invoiceSnapshotNoPaymentId
          )
        )
      await db
        .delete(schema.invoicePublicLink)
        .where(
          eq(
            schema.invoicePublicLink.invoiceSnapshotId,
            invoiceSnapshotNoPaymentId
          )
        )
      await db
        .delete(schema.invoiceSnapshot)
        .where(eq(schema.invoiceSnapshot.id, invoiceSnapshotNoPaymentId))
      await db
        .delete(schema.invoiceDraft)
        .where(eq(schema.invoiceDraft.id, invoiceDraftNoPaymentId))
    }

    if (orgId) {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgId))
    }
    if (orgNoPaymentId) {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgNoPaymentId))
    }
  })

  describe("Token Priority & Boundary Resolution", () => {
    test("token with BOTH revoked status and expired date prioritizes revoked status", async () => {
      const res = await getPublicProposal(proposalRevokedAndExpiredToken)
      expect(res).toEqual({ status: "unavailable", reason: "revoked" })
    })

    test("token with status='active' but revokedAt non-null returns unavailable (revoked)", async () => {
      const res = await getPublicProposal(proposalActiveWithRevokedAtToken)
      expect(res).toEqual({ status: "unavailable", reason: "revoked" })
    })

    test("invoice for organization without paymentLinkUrl returns null paymentLinkUrl", async () => {
      const res = await getPublicInvoice(invoiceNoPaymentToken)
      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.paymentLinkUrl).toBeNull()
      }
    })
  })

  describe("Double Acceptance & Idempotency Challenge", () => {
    test("accepting a proposal twice succeeds and records multiple acceptances", async () => {
      const acc1 = await acceptPublicProposal({
        token: proposalValidToken,
        signerName: "First Signer",
        signerEmail: "first@example.com",
        agreedTerms: true,
      })
      expect(acc1.signerName).toBe("First Signer")

      const acc2 = await acceptPublicProposal({
        token: proposalValidToken,
        signerName: "Second Signer",
        signerEmail: "second@example.com",
        agreedTerms: true,
      })
      expect(acc2.signerName).toBe("Second Signer")

      // getPublicProposal should return the LATEST acceptance record
      const res = await getPublicProposal(proposalValidToken)
      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.accepted?.signerName).toBe("Second Signer")
      }

      // Check DB count for acceptances on this snapshot
      const acceptances = await db
        .select()
        .from(schema.proposalAcceptance)
        .where(
          eq(schema.proposalAcceptance.proposalSnapshotId, proposalSnapshotId)
        )

      expect(acceptances.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("OTP Edge Cases", () => {
    test("multiple OTP requests for same link/email allows verifying any unexpired code", async () => {
      const publicLinkId = crypto.randomUUID()
      const email = "multiotp@example.com"

      await sendOtp(publicLinkId, email)
      await new Promise((r) => setTimeout(r, 10)) // short pause
      await sendOtp(publicLinkId, email)

      const otps = await db
        .select()
        .from(schema.publicLinkOtp)
        .where(eq(schema.publicLinkOtp.publicLinkId, publicLinkId))
        .orderBy(schema.publicLinkOtp.createdAt)

      expect(otps.length).toBe(2)
      const code1 = otps[0].code
      const code2 = otps[1].code

      // Verifying code2 (latest) should succeed
      const res2 = await verifyOtp(publicLinkId, email, code2)
      expect(res2).toEqual({ success: true })

      // Verifying code1 (older unexpired code) should ALSO succeed if not previously verified
      const res1 = await verifyOtp(publicLinkId, email, code1)
      expect(res1).toEqual({ success: true })
    })

    test("verifyOtp fails when publicLinkId or email does not match", async () => {
      const publicLinkId = crypto.randomUUID()
      const email = "user@example.com"

      await sendOtp(publicLinkId, email)

      const [otpRow] = await db
        .select()
        .from(schema.publicLinkOtp)
        .where(eq(schema.publicLinkOtp.publicLinkId, publicLinkId))

      // Wrong email
      const wrongEmailRes = await verifyOtp(
        publicLinkId,
        "wrong@example.com",
        otpRow.code
      )
      expect(wrongEmailRes).toEqual({
        success: false,
        reason: "invalid_or_expired",
      })

      // Wrong publicLinkId
      const wrongLinkRes = await verifyOtp(
        crypto.randomUUID(),
        email,
        otpRow.code
      )
      expect(wrongLinkRes).toEqual({
        success: false,
        reason: "invalid_or_expired",
      })
    })
  })

  describe("API Endpoint Validation & Malformed Payload Resilience", () => {
    test("POST /api/public/proposal/:token/accept with invalid JSON body returns 400", async () => {
      const req = new Request(
        `http://localhost/api/public/proposal/${proposalValidToken}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "invalid-json",
        }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(400)
    })

    test("POST /api/public/proposal/:token/accept returns 400 when agreedTerms is false", async () => {
      const req = new Request(
        `http://localhost/api/public/proposal/${proposalValidToken}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signerName: "No Terms Signer",
            signerEmail: "noterms@example.com",
            agreedTerms: false,
          }),
        }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(400)
      const json = (await res.json()) as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain("agreedTerms")
    })

    test("POST /api/public/event with missing required fields returns 400", async () => {
      const req = new Request("http://localhost/api/public/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "proposal",
          // token missing
          eventType: "document.viewed",
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(400)
    })

    test("POST /api/public/event with invalid documentType returns 404", async () => {
      const req = new Request("http://localhost/api/public/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "unknown_doc",
          token: proposalValidToken,
          eventType: "document.viewed",
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(404)
    })
  })
})
