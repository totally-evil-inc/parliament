import { describe, expect, it } from "bun:test"
import { processCalComWebhook } from "./cal"

const validOrgId = "019fecc1-a4fd-7086-b102-f7f5d78e9f82"

describe("Cal.com Webhook & Cancellation Rollback Handler", () => {
  it("ignores webhook payload without attendees", async () => {
    const res = await processCalComWebhook(
      { triggerEvent: "BOOKING_CREATED", payload: { attendees: [] } },
      validOrgId
    )
    expect(res.status).toBe("ignored")
  })

  it("handles unsupported events gracefully", async () => {
    const res = await processCalComWebhook(
      {
        triggerEvent: "UNSUPPORTED_EVENT",
        payload: { attendees: [{ email: "test@example.com" }] },
      },
      validOrgId
    )
    expect(res.status).toBe("ignored")
    expect(res.reason).toBe("unsupported event")
  })
})
