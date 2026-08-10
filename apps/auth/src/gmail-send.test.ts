import { describe, expect, it } from "bun:test"
import { app } from "./index"
import { buildRfc2822RawMessage } from "./lib/gmail/send-service"

describe("Gmail Direct Send & Draft Backend", () => {
  it("builds RFC 2822 raw message with base64url encoding", () => {
    const raw = buildRfc2822RawMessage({
      to: "client@example.com",
      subject: "Proposal Document",
      htmlText: "<h1>Hello Client</h1>",
      replyTo: "proposal-123@reply.parliament.app",
    })

    expect(raw).toBeDefined()
    expect(typeof raw).toBe("string")
    expect(raw.includes("+")).toBe(false)
    expect(raw.includes("/")).toBe(false)
  })

  it("returns 401 when sending without authentication session", async () => {
    const res = await app.request("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "client@example.com",
        subject: "Test",
        htmlText: "<p>Test</p>",
      }),
    })

    expect(res.status).toBe(401)
  })

  it("returns 401 when creating draft without authentication session", async () => {
    const res = await app.request("/api/gmail/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "client@example.com",
        subject: "Draft Test",
        htmlText: "<p>Draft Content</p>",
      }),
    })

    expect(res.status).toBe(401)
  })
})
