import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { db, eq, schema } from "@workspace/database"
import { createInvoiceDraftFromBlueprint } from "@workspace/document/invoice"
import { createProposalDraftFromBlueprint } from "@workspace/document/proposal"
import { app } from "../index"
import { recordClientEvent } from "./events"
import { acceptPublicInvoice, getPublicInvoice } from "./invoices"
import { sendOtp, verifyOtp } from "./otp"
import { acceptPublicProposal, getPublicProposal } from "./proposals"

describe("Milestone 3 Token Validation & Backend API (apps/gate)", () => {
  let orgId: string
  let proposalDraftId: string
  let proposalSnapshotId: string
  let proposalValidToken: string
  let proposalRevokedToken: string
  let proposalExpiredToken: string

  let invoiceDraftId: string
  let invoiceSnapshotId: string
  let invoiceValidToken: string
  let invoiceRevokedToken: string
  let invoiceExpiredToken: string

  beforeAll(async () => {
    // 1. Create Organization
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Test Org Gate",
        slug: `test-org-gate-${crypto.randomUUID()}`,
        createdAt: new Date(),
        paymentLinkUrl: "https://pay.example.com/org-gate",
      })
      .returning()
    orgId = org.id

    // 2. Proposal Setup
    proposalDraftId = crypto.randomUUID()
    const proposalDoc = createProposalDraftFromBlueprint({
      id: proposalDraftId,
      blueprint: "classic",
      sellerName: "Test Seller",
    })

    await db.insert(schema.proposalDraft).values({
      id: proposalDraftId,
      organizationId: orgId,
      title: "Gate Test Proposal",
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
        contentHash: "hash-proposal-123",
        templateId: "proposal-classic",
        templateVersion: 1,
      })
      .returning()
    proposalSnapshotId = pSnapshot.id

    proposalValidToken = `token_proposal_valid_${crypto.randomUUID()}`
    await db.insert(schema.proposalPublicLink).values({
      proposalSnapshotId,
      organizationId: orgId,
      token: proposalValidToken,
      status: "active",
    })

    proposalRevokedToken = `token_proposal_revoked_${crypto.randomUUID()}`
    await db.insert(schema.proposalPublicLink).values({
      proposalSnapshotId,
      organizationId: orgId,
      token: proposalRevokedToken,
      status: "active",
      revokedAt: new Date(),
    })

    proposalExpiredToken = `token_proposal_expired_${crypto.randomUUID()}`
    await db.insert(schema.proposalPublicLink).values({
      proposalSnapshotId,
      organizationId: orgId,
      token: proposalExpiredToken,
      status: "active",
      expiresAt: new Date(Date.now() - 60000), // 1 minute ago
    })

    // 3. Invoice Setup
    invoiceDraftId = crypto.randomUUID()
    const invoiceDoc = createInvoiceDraftFromBlueprint({
      id: invoiceDraftId,
      blueprint: "classic",
      sellerName: "Test Seller",
    })

    await db.insert(schema.invoiceDraft).values({
      id: invoiceDraftId,
      organizationId: orgId,
      title: "Gate Test Invoice",
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
        contentHash: "hash-invoice-123",
        templateId: "invoice-classic",
        templateVersion: 1,
      })
      .returning()
    invoiceSnapshotId = iSnapshot.id

    invoiceValidToken = `token_invoice_valid_${crypto.randomUUID()}`
    await db.insert(schema.invoicePublicLink).values({
      invoiceSnapshotId,
      organizationId: orgId,
      token: invoiceValidToken,
      status: "active",
    })

    invoiceRevokedToken = `token_invoice_revoked_${crypto.randomUUID()}`
    await db.insert(schema.invoicePublicLink).values({
      invoiceSnapshotId,
      organizationId: orgId,
      token: invoiceRevokedToken,
      status: "active",
      revokedAt: new Date(),
    })

    invoiceExpiredToken = `token_invoice_expired_${crypto.randomUUID()}`
    await db.insert(schema.invoicePublicLink).values({
      invoiceSnapshotId,
      organizationId: orgId,
      token: invoiceExpiredToken,
      status: "active",
      expiresAt: new Date(Date.now() - 60000),
    })
  })

  afterAll(async () => {
    // Cleanup created data
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

    if (orgId) {
      await db
        .delete(schema.publicLinkOtp)
        .where(eq(schema.publicLinkOtp.email, "otpuser@example.com"))
      await db
        .delete(schema.publicLinkOtp)
        .where(eq(schema.publicLinkOtp.email, "otpverify@example.com"))
      await db
        .delete(schema.publicLinkOtp)
        .where(eq(schema.publicLinkOtp.email, "otpexpired@example.com"))
      await db
        .delete(schema.publicLinkOtp)
        .where(eq(schema.publicLinkOtp.email, "apiotp@example.com"))
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgId))
    }
  })

  describe("Proposals Server Logic", () => {
    test("getPublicProposal returns ready for valid token and records link.opened event", async () => {
      const res = await getPublicProposal(proposalValidToken, {
        sessionEmail: "test@example.com",
        ipAddress: "127.0.0.1",
        userAgent: "TestAgent/1.0",
      })

      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.token).toBe(proposalValidToken)
        expect(res.snapshotId).toBe(proposalSnapshotId)
        expect(res.document.id).toBe(proposalDraftId)
        expect(res.accepted).toBeNull()
      }

      // Verify event was logged
      const events = await db
        .select()
        .from(schema.proposalEvent)
        .where(eq(schema.proposalEvent.proposalSnapshotId, proposalSnapshotId))

      const openedEvent = events.find((e) => e.eventType === "link.opened")
      expect(openedEvent).toBeDefined()
    })

    test("getPublicProposal returns forbidden if session email does not match recipient email", async () => {
      const res = await getPublicProposal(proposalValidToken, {
        sessionEmail: "wrongemail@example.com",
      })
      expect(res.status).toBe("forbidden")
    })

    test("getPublicProposal returns not_found for nonexistent token", async () => {
      const res = await getPublicProposal("nonexistent_token_12345", {
        sessionEmail: "test@example.com",
      })
      expect(res).toEqual({ status: "not_found" })
    })

    test("getPublicProposal returns unavailable (revoked) for revoked token", async () => {
      const res = await getPublicProposal(proposalRevokedToken, {
        sessionEmail: "test@example.com",
      })
      expect(res).toEqual({ status: "unavailable", reason: "revoked" })
    })

    test("getPublicProposal returns unavailable (expired) for expired token", async () => {
      const res = await getPublicProposal(proposalExpiredToken, {
        sessionEmail: "test@example.com",
      })
      expect(res).toEqual({ status: "unavailable", reason: "expired" })
    })

    test("acceptPublicProposal inserts acceptance, records signature.completed event, updates draft status", async () => {
      const acceptance = await acceptPublicProposal({
        token: proposalValidToken,
        signerName: "John Doe",
        signerEmail: "john@example.com",
        signatureText: "John Doe Signature",
        agreedTerms: true,
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
      })

      expect(acceptance.id).toBeDefined()
      expect(acceptance.signerName).toBe("John Doe")
      expect(acceptance.signerEmail).toBe("john@example.com")
      expect(acceptance.agreedTerms).toBe(true)

      // Verify draft status updated to accepted
      const [draft] = await db
        .select()
        .from(schema.proposalDraft)
        .where(eq(schema.proposalDraft.id, proposalDraftId))
      expect(draft.status).toBe("accepted")

      // Verify getPublicProposal now returns accepted record
      const res = await getPublicProposal(proposalValidToken, {
        sessionEmail: "test@example.com",
      })
      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.accepted).not.toBeNull()
        expect(res.accepted?.signerName).toBe("John Doe")
      }
    })
  })

  describe("Invoices Server Logic", () => {
    test("getPublicInvoice returns ready with paymentLinkUrl and records link.opened event", async () => {
      const res = await getPublicInvoice(invoiceValidToken, {
        sessionEmail: "test@example.com",
        ipAddress: "127.0.0.1",
        userAgent: "TestAgent/1.0",
      })

      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.token).toBe(invoiceValidToken)
        expect(res.snapshotId).toBe(invoiceSnapshotId)
        expect(res.paymentLinkUrl).toBe("https://pay.example.com/org-gate")
        expect(res.accepted).toBeNull()
      }

      // Verify event was logged
      const events = await db
        .select()
        .from(schema.invoiceEvent)
        .where(eq(schema.invoiceEvent.invoiceSnapshotId, invoiceSnapshotId))

      const openedEvent = events.find((e) => e.eventType === "link.opened")
      expect(openedEvent).toBeDefined()
    })

    test("getPublicInvoice returns forbidden if session email does not match recipient email", async () => {
      const res = await getPublicInvoice(invoiceValidToken, {
        sessionEmail: "wrongemail@example.com",
      })
      expect(res.status).toBe("forbidden")
    })

    test("getPublicInvoice returns not_found for nonexistent token", async () => {
      const res = await getPublicInvoice("nonexistent_token_12345", {
        sessionEmail: "test@example.com",
      })
      expect(res).toEqual({ status: "not_found" })
    })

    test("getPublicInvoice returns unavailable (revoked) for revoked token", async () => {
      const res = await getPublicInvoice(invoiceRevokedToken, {
        sessionEmail: "test@example.com",
      })
      expect(res).toEqual({ status: "unavailable", reason: "revoked" })
    })

    test("getPublicInvoice returns unavailable (expired) for expired token", async () => {
      const res = await getPublicInvoice(invoiceExpiredToken, {
        sessionEmail: "test@example.com",
      })
      expect(res).toEqual({ status: "unavailable", reason: "expired" })
    })

    test("acceptPublicInvoice inserts acceptance, records signature.completed event, updates draft status", async () => {
      const acceptance = await acceptPublicInvoice({
        token: invoiceValidToken,
        signerName: "Jane Smith",
        signerEmail: "jane@example.com",
        signatureImage: "data:image/png;base64,sample",
        agreedTerms: true,
        ipAddress: "192.168.1.2",
        userAgent: "TestBrowser/2.0",
      })

      expect(acceptance.id).toBeDefined()
      expect(acceptance.signerName).toBe("Jane Smith")
      expect(acceptance.signerEmail).toBe("jane@example.com")
      expect(acceptance.agreedTerms).toBe(true)

      // Verify draft status updated to accepted
      const [draft] = await db
        .select()
        .from(schema.invoiceDraft)
        .where(eq(schema.invoiceDraft.id, invoiceDraftId))
      expect(draft.status).toBe("accepted")

      // Verify getPublicInvoice now returns accepted record
      const res = await getPublicInvoice(invoiceValidToken, {
        sessionEmail: "test@example.com",
      })
      expect(res.status).toBe("ready")
      if (res.status === "ready") {
        expect(res.accepted).not.toBeNull()
        expect(res.accepted?.signerName).toBe("Jane Smith")
      }
    })
  })

  describe("OTP Server Logic", () => {
    test("sendOtp generates 6-digit code and stores in public_link_otp", async () => {
      const publicLinkId = crypto.randomUUID()
      const email = "otpuser@example.com"

      const res = await sendOtp(publicLinkId, email)
      expect(res).toEqual({ success: true, message: "OTP sent" })

      const otps = await db
        .select()
        .from(schema.publicLinkOtp)
        .where(eq(schema.publicLinkOtp.publicLinkId, publicLinkId))

      expect(otps).toHaveLength(1)
      expect(otps[0].email).toBe(email)
      expect(otps[0].code).toHaveLength(6)
    })

    test("verifyOtp verifies valid code and marks verifiedAt", async () => {
      const publicLinkId = crypto.randomUUID()
      const email = "otpverify@example.com"

      await sendOtp(publicLinkId, email)

      const [otpRow] = await db
        .select()
        .from(schema.publicLinkOtp)
        .where(eq(schema.publicLinkOtp.publicLinkId, publicLinkId))

      const verifyRes = await verifyOtp(publicLinkId, email, otpRow.code)
      expect(verifyRes).toEqual({ success: true })

      const [updatedOtp] = await db
        .select()
        .from(schema.publicLinkOtp)
        .where(eq(schema.publicLinkOtp.id, otpRow.id))

      expect(updatedOtp.verifiedAt).not.toBeNull()

      // Second verification fails because it is already verified
      const secondVerify = await verifyOtp(publicLinkId, email, otpRow.code)
      expect(secondVerify).toEqual({
        success: false,
        reason: "invalid_or_expired",
      })
    })

    test("verifyOtp fails for invalid code or expired OTP", async () => {
      const publicLinkId = crypto.randomUUID()
      const email = "otpexpired@example.com"

      // Insert expired OTP
      await db.insert(schema.publicLinkOtp).values({
        publicLinkId,
        email,
        code: "999999",
        expiresAt: new Date(Date.now() - 10000), // 10s ago
      })

      const verifyRes = await verifyOtp(publicLinkId, email, "999999")
      expect(verifyRes).toEqual({
        success: false,
        reason: "invalid_or_expired",
      })

      const invalidCodeRes = await verifyOtp(publicLinkId, email, "000000")
      expect(invalidCodeRes).toEqual({
        success: false,
        reason: "invalid_or_expired",
      })
    })
  })

  describe("Event Recording Server Logic", () => {
    test("recordClientEvent records document.viewed for proposal", async () => {
      const result = await recordClientEvent({
        documentType: "proposal",
        token: proposalValidToken,
        eventType: "document.viewed",
        metadata: { page: 1 },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.eventId).toBeDefined()
      }
    })

    test("recordClientEvent records payment.initiated for invoice", async () => {
      const result = await recordClientEvent({
        documentType: "invoice",
        token: invoiceValidToken,
        eventType: "payment.initiated",
        metadata: { provider: "stripe" },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.eventId).toBeDefined()
      }
    })

    test("recordClientEvent returns not_found for invalid token", async () => {
      const result = await recordClientEvent({
        documentType: "proposal",
        token: "invalid_token_xyz",
        eventType: "document.viewed",
      })

      expect(result).toEqual({ success: false, reason: "not_found" })
    })
  })

  describe("Hono API Integration Routes", () => {
    test("GET /api/public/proposal/:token/meta returns proposal metadata", async () => {
      const req = new Request(
        `http://localhost/api/public/proposal/${proposalValidToken}/meta`,
        { method: "GET" }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(200)

      const json = (await res.json()) as { status: string; token: string }
      expect(json.status).toBe("ready")
      expect(json.token).toBe(proposalValidToken)
    })

    test("GET /api/public/proposal/:token returns 401 if unauthenticated", async () => {
      const req = new Request(
        `http://localhost/api/public/proposal/${proposalValidToken}`,
        { method: "GET" }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(401)
    })

    test("GET /api/public/proposal/:token returns proposal details when authenticated", async () => {
      const req = new Request(
        `http://localhost/api/public/proposal/${proposalValidToken}`,
        {
          method: "GET",
          headers: { "x-test-session-email": "test@example.com" },
        }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(200)

      const json = (await res.json()) as { status: string; token: string }
      expect(json.status).toBe("ready")
      expect(json.token).toBe(proposalValidToken)
    })

    test("GET /api/public/proposal/:token returns 404 for invalid token", async () => {
      const req = new Request(
        "http://localhost/api/public/proposal/nonexistent_token_999",
        {
          method: "GET",
          headers: { "x-test-session-email": "test@example.com" },
        }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(404)
    })

    test("POST /api/public/proposal/:token/accept accepts proposal via API", async () => {
      const req = new Request(
        `http://localhost/api/public/proposal/${proposalValidToken}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-session-email": "test@example.com",
          },
          body: JSON.stringify({
            signerName: "API Signer",
            signerEmail: "apisigner@example.com",
            signatureText: "API Signer",
            agreedTerms: true,
          }),
        }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(200)

      const json = (await res.json()) as {
        success: boolean
        accepted: { signerName: string }
      }
      expect(json.success).toBe(true)
      expect(json.accepted.signerName).toBe("API Signer")
    })

    test("GET /api/public/invoice/:token returns invoice details when authenticated", async () => {
      const req = new Request(
        `http://localhost/api/public/invoice/${invoiceValidToken}`,
        {
          method: "GET",
          headers: { "x-test-session-email": "test@example.com" },
        }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(200)

      const json = (await res.json()) as {
        status: string
        paymentLinkUrl: string
      }
      expect(json.status).toBe("ready")
      expect(json.paymentLinkUrl).toBe("https://pay.example.com/org-gate")
    })

    test("POST /api/public/invoice/:token/accept accepts invoice via API", async () => {
      const req = new Request(
        `http://localhost/api/public/invoice/${invoiceValidToken}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-session-email": "test@example.com",
          },
          body: JSON.stringify({
            signerName: "API Invoice Signer",
            signerEmail: "apiinvoice@example.com",
            agreedTerms: true,
          }),
        }
      )
      const res = await app.fetch(req)
      expect(res.status).toBe(200)

      const json = (await res.json()) as {
        success: boolean
        accepted: { signerName: string }
      }
      expect(json.success).toBe(true)
      expect(json.accepted.signerName).toBe("API Invoice Signer")
    })

    test("POST /api/public/event records event via API", async () => {
      const req = new Request("http://localhost/api/public/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "proposal",
          token: proposalValidToken,
          eventType: "document.downloaded",
          metadata: { format: "pdf" },
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(200)

      const json = (await res.json()) as {
        success: boolean
        eventId: string
      }
      expect(json.success).toBe(true)
      expect(json.eventId).toBeDefined()
    })
  })
})
