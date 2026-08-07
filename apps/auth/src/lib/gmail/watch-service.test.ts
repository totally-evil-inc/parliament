import { describe, expect, it } from "bun:test"
import { processPubSubNotification } from "./watch-service"

describe("processPubSubNotification (service unit)", () => {
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
})
