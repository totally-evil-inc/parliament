import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { app } from "./index"

const ADDON_AUTH_SECRET = "test-addon-secret"
const originalSecret = process.env.ADDON_AUTH_SECRET

describe("Google Workspace Add-on API", () => {
  beforeAll(() => {
    process.env.ADDON_AUTH_SECRET = ADDON_AUTH_SECRET
  })

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.ADDON_AUTH_SECRET
    } else {
      process.env.ADDON_AUTH_SECRET = originalSecret
    }
  })

  it("returns valid Add-on manifest JSON with non-sensitive scopes", async () => {
    const res = await app.request("/api/gmail/addon/manifest", {
      method: "GET",
    })

    expect(res.status).toBe(200)
    const manifest = (await res.json()) as {
      oauthScopes: string[]
      gmail: { name: string }
    }
    expect(manifest.oauthScopes).toContain(
      "https://www.googleapis.com/auth/gmail.addons.execute"
    )
    expect(manifest.gmail.name).toBe("Parliament Operational Sidebar")
  })

  it("rejects /context without an authenticated session or add-on secret", async () => {
    const res = await app.request("/api/gmail/addon/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderEmail: "client@acme.corp",
        messageId: "msg_999",
      }),
    })

    expect(res.status).toBe(401)
  })

  it("returns contextual active message details when authenticated via add-on secret", async () => {
    const res = await app.request("/api/gmail/addon/context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADDON_AUTH_SECRET}`,
      },
      body: JSON.stringify({
        senderEmail: "client@acme.corp",
        messageId: "msg_999",
      }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      success: boolean
      clientEmail: string
      activeProposals: unknown[]
    }
    expect(json.success).toBe(true)
    expect(json.clientEmail).toBe("client@acme.corp")
    expect(json.activeProposals.length).toBeGreaterThan(0)
  })
})
