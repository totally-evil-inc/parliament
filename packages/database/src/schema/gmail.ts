import { relations, sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./user"

export const gmailWatchSubscription = pgTable(
  "gmail_watch_subscription",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    historyId: text("history_id"),
    expiration: timestamp("expiration"),
    topicName: text("topic_name"),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("gmail_watch_subscription_user_id_idx").on(table.userId),
    index("gmail_watch_subscription_user_email_idx").on(table.userEmail),
  ]
)

export const gmailWatchSubscriptionRelations = relations(
  gmailWatchSubscription,
  ({ one }) => ({
    user: one(user, {
      fields: [gmailWatchSubscription.userId],
      references: [user.id],
    }),
  })
)

export const emailThreadActivity = pgTable(
  "email_thread_activity",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull(),
    messageId: text("message_id"),
    subject: text("subject"),
    snippet: text("snippet"),
    fromEmail: text("from_email"),
    toEmail: text("to_email"),
    activityType: text("activity_type").notNull(),
    status: text("status").default("processed").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("email_thread_activity_user_id_idx").on(table.userId),
    index("email_thread_activity_thread_id_idx").on(table.threadId),
  ]
)

export const emailThreadActivityRelations = relations(
  emailThreadActivity,
  ({ one }) => ({
    user: one(user, {
      fields: [emailThreadActivity.userId],
      references: [user.id],
    }),
  })
)

export const inboundWebhookLog = pgTable(
  "inbound_webhook_log",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    provider: text("provider").default("gmail").notNull(),
    eventType: text("event_type"),
    payload: jsonb("payload").notNull(),
    headers: jsonb("headers"),
    status: text("status").default("received").notNull(),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("inbound_webhook_log_provider_idx").on(table.provider),
    index("inbound_webhook_log_status_idx").on(table.status),
  ]
)
