import { describe, expect, it } from "bun:test"
import { app } from "./index"

describe("Gmail Watch & Pub/Sub Webhook API", () => {
  it("returns 401 on /api/gmail/watch/register when unauthenticated", async () => {
    const res = await app.request("/api/gmail/watch/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(401)
  })

  it("rejects /api/gmail/pubsub/webhook push requests with an empty body", async () => {
    const res = await app.request("/api/gmail/pubsub/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error?: string }
    expect(json.error).toContain("message.data")
  })

  it("acknowledges /api/gmail/pubsub/webhook push requests with a valid payload", async () => {
    const base64Data = Buffer.from(
      JSON.stringify({
        emailAddress: "unknown-test@example.com",
        historyId: "99887766",
      })
    ).toString("base64")

    const res = await app.request("/api/gmail/pubsub/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          data: base64Data,
          messageId: "msg_123",
          publishTime: new Date().toISOString(),
        },
      }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as { success?: boolean }
    expect(typeof json.success).toBe("boolean")
  })

  it("returns 401 on /api/gmail/thread-activity when unauthenticated", async () => {
    const res = await app.request("/api/gmail/thread-activity", {
      method: "GET",
    })

    expect(res.status).toBe(401)
  })
})
