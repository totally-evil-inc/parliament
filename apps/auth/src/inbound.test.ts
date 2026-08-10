import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { app } from "./index"

const WEBHOOK_SECRET = "test-webhook-secret"
const originalSecret = process.env.INBOUND_WEBHOOK_SECRET

describe("Zero-OAuth Inbound Ingestion Engine", () => {
  it("accepts cryptographic Reply-To email webhook payload", async () => {
    const res = await app.request("/api/inbound/reply-to", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "proposal-token-98234",
        fromEmail: "client@acme.corp",
        subject: "Re: Branding Proposal v2",
        textBody: "Looks good, approved!",
        workspaceId: "ws-123",
      }),
    })

    expect(res.status).toBe(200)
    const json: any = await res.json()
    expect(json.success).toBe(true)
    expect(json.logId).toBeDefined()
  })

  it("returns 400 when Reply-To webhook payload is missing required fields", async () => {
    const res = await app.request("/api/inbound/reply-to", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textBody: "Missing fromEmail and subject",
      }),
    })

    expect(res.status).toBe(400)
  })

  it("accepts user-owned Apps Script webhook payload", async () => {
    const res = await app.request("/api/inbound/apps-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "ws-456",
        email: "user@domain.com",
        attachments: [{ filename: "invoice_99.pdf", size: 1024 }],
      }),
    })

    expect(res.status).toBe(200)
    const json: any = await res.json()
    expect(json.success).toBe(true)
    expect(json.attachmentsIngested).toBe(1)
  })

  it("returns 401 on /api/inbound/drive-drop when unauthenticated", async () => {
    const res = await app.request("/api/inbound/drive-drop", {
      method: "POST",
    })

    expect(res.status).toBe(401)
  })

  describe("webhook secret enforcement", () => {
    beforeAll(() => {
      process.env.INBOUND_WEBHOOK_SECRET = WEBHOOK_SECRET
    })

    afterAll(() => {
      if (originalSecret === undefined) {
        delete process.env.INBOUND_WEBHOOK_SECRET
      } else {
        process.env.INBOUND_WEBHOOK_SECRET = originalSecret
      }
    })

    it("returns 401 on /api/inbound/reply-to when the webhook secret is missing", async () => {
      const res = await app.request("/api/inbound/reply-to", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "proposal-token-98234",
          fromEmail: "client@acme.corp",
          subject: "Re: Branding Proposal v2",
          textBody: "Looks good, approved!",
          workspaceId: "ws-123",
        }),
      })

      expect(res.status).toBe(401)
    })

    it("accepts /api/inbound/reply-to when the webhook secret matches", async () => {
      const res = await app.request("/api/inbound/reply-to", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-command-webhook-secret": WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          token: "proposal-token-98234",
          fromEmail: "client@acme.corp",
          subject: "Re: Branding Proposal v2",
          textBody: "Looks good, approved!",
          workspaceId: "ws-123",
        }),
      })

      expect(res.status).toBe(200)
    })

    it("returns 401 on /api/inbound/apps-script when the webhook secret is missing", async () => {
      const res = await app.request("/api/inbound/apps-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws-456",
          email: "user@domain.com",
          attachments: [{ filename: "invoice_99.pdf", size: 1024 }],
        }),
      })

      expect(res.status).toBe(401)
    })
  })
})
