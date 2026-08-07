import { describe, expect, it } from "bun:test"
import { app } from "./index"
import { processPubSubNotification } from "./lib/gmail/watch-service"

describe("Gmail Watch & Pub/Sub Webhook Engine", () => {
  it("rejects invalid/empty Pub/Sub push notification gracefully", async () => {
    const result = await processPubSubNotification({})
    expect(result.processed).toBe(false)
    expect(result.reason).toBe("Missing message.data")
  })

  it("handles valid base64 encoded Pub/Sub push payload format", async () => {
    const payload = {
      emailAddress: "unknown-test@example.com",
      historyId: "99887766",
    }
    const base64Data = Buffer.from(JSON.stringify(payload)).toString("base64")

    const result = await processPubSubNotification({
      message: {
        data: base64Data,
        messageId: "msg_123",
        publishTime: new Date().toISOString(),
      },
    })

    expect(typeof result.processed).toBe("boolean")
  })

  it("returns 401 on /api/gmail/watch/register when unauthenticated", async () => {
    const res = await app.request("/api/gmail/watch/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(401)
  })

  it("accepts /api/gmail/pubsub/webhook POST push requests", async () => {
    const res = await app.request("/api/gmail/pubsub/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(200)
    const json: any = await res.json()
    expect(typeof json.success).toBe("boolean")
  })

  it("returns 401 on /api/gmail/thread-activity when unauthenticated", async () => {
    const res = await app.request("/api/gmail/thread-activity", {
      method: "GET",
    })

    expect(res.status).toBe(401)
  })
})
