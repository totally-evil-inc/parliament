import { describe, expect, it } from "bun:test"
import { getTableColumns, getTableName } from "drizzle-orm"
import {
  emailThreadActivity,
  gmailWatchSubscription,
  inboundWebhookLog,
} from "./index"
import * as schema from "./schema"

describe("Gmail schema definitions", () => {
  it("exports gmail tables from schema index", () => {
    expect(schema.gmailWatchSubscription).toBeDefined()
    expect(schema.emailThreadActivity).toBeDefined()
    expect(schema.inboundWebhookLog).toBeDefined()
  })

  it("has correct table names", () => {
    expect(getTableName(gmailWatchSubscription)).toBe("gmail_watch_subscription")
    expect(getTableName(emailThreadActivity)).toBe("email_thread_activity")
    expect(getTableName(inboundWebhookLog)).toBe("inbound_webhook_log")
  })

  it("defines valid columns for gmailWatchSubscription", () => {
    const columns = getTableColumns(gmailWatchSubscription)
    expect(columns.id.name).toBe("id")
    expect(columns.userId.name).toBe("user_id")
    expect(columns.userEmail.name).toBe("user_email")
    expect(columns.historyId.name).toBe("history_id")
    expect(columns.expiration.name).toBe("expiration")
    expect(columns.topicName.name).toBe("topic_name")
    expect(columns.status.name).toBe("status")
    expect(columns.createdAt.name).toBe("created_at")
    expect(columns.updatedAt.name).toBe("updated_at")
  })

  it("defines valid columns for emailThreadActivity", () => {
    const columns = getTableColumns(emailThreadActivity)
    expect(columns.id.name).toBe("id")
    expect(columns.userId.name).toBe("user_id")
    expect(columns.threadId.name).toBe("thread_id")
    expect(columns.messageId.name).toBe("message_id")
    expect(columns.subject.name).toBe("subject")
    expect(columns.snippet.name).toBe("snippet")
    expect(columns.fromEmail.name).toBe("from_email")
    expect(columns.toEmail.name).toBe("to_email")
    expect(columns.activityType.name).toBe("activity_type")
    expect(columns.status.name).toBe("status")
    expect(columns.metadata.name).toBe("metadata")
    expect(columns.createdAt.name).toBe("created_at")
    expect(columns.updatedAt.name).toBe("updated_at")
  })

  it("defines valid columns for inboundWebhookLog", () => {
    const columns = getTableColumns(inboundWebhookLog)
    expect(columns.id.name).toBe("id")
    expect(columns.provider.name).toBe("provider")
    expect(columns.eventType.name).toBe("event_type")
    expect(columns.payload.name).toBe("payload")
    expect(columns.headers.name).toBe("headers")
    expect(columns.status.name).toBe("status")
    expect(columns.errorMessage.name).toBe("error_message")
    expect(columns.processedAt.name).toBe("processed_at")
    expect(columns.createdAt.name).toBe("created_at")
  })
})
