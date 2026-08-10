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
    expect(res.reason).toBe("missing attendee data")
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

  it("returns no_matching_deal when attendee email does not match any contact", async () => {
    const res = await processCalComWebhook(
      {
        triggerEvent: "BOOKING_CREATED",
        payload: { attendees: [{ email: "unknown@example.com" }] },
      },
      validOrgId
    )
    expect(res.status).toBe("no_matching_deal")
    expect(res.reason).toBe("contact not found for attendee email")
  })

  it("returns no_matching_deal when cancellation attendee email has no contact", async () => {
    const res = await processCalComWebhook(
      {
        triggerEvent: "BOOKING_CANCELLED",
        payload: { attendees: [{ email: "unknown@example.com" }] },
      },
      validOrgId
    )
    expect(res.status).toBe("no_matching_deal")
    expect(res.reason).toBe("contact not found for attendee email")
  })
})
