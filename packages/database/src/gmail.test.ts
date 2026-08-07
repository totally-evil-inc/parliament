import { describe, expect, it } from "bun:test"
import {
  emailThreadActivity,
  gmailWatchSubscription,
  inboundWebhookLog,
} from "./schema/gmail"

describe("Gmail Database Schema", () => {
  it("exports valid table schemas for gmailwatch, emailthread, and inboundwebhook", () => {
    expect(gmailWatchSubscription).toBeDefined()
    expect(emailThreadActivity).toBeDefined()
    expect(inboundWebhookLog).toBeDefined()

    expect(gmailWatchSubscription.userId).toBeDefined()
    expect(emailThreadActivity.threadId).toBeDefined()
    expect(inboundWebhookLog.payloadType).toBeDefined()
  })
})
