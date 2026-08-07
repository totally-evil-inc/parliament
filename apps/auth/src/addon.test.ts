import { describe, expect, it } from "bun:test"
import { app } from "./index"

describe("Google Workspace Add-on API", () => {
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

  it("returns contextual active message details for opened email", async () => {
    const res = await app.request("/api/gmail/addon/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
