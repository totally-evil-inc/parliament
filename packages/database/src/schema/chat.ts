import type { MessagePartJson } from "@workspace/agent/message-parts"
import { relations, sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { organization } from "./organization"
import { user } from "./user"

export const chatConversation = pgTable(
  "chat_conversation",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    title: text("title").default("New conversation").notNull(),
    model: text("model"),
    status: text("status")
      .$type<"active" | "archived">()
      .default("active")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
  },
  (table) => [
    index("chat_conversation_org_updated_idx").on(
      table.organizationId,
      table.updatedAt
    ),
  ]
)

export const chatMessage = pgTable(
  "chat_message",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversation.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "assistant" | "system">().notNull(),
    parts: jsonb("parts").$type<MessagePartJson[]>().notNull(),
    status: text("status")
      .$type<"complete" | "interrupted" | "error">()
      .default("complete")
      .notNull(),
    model: text("model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_message_conv_created_idx").on(
      table.conversationId,
      table.createdAt
    ),
    index("chat_message_org_idx").on(table.organizationId),
  ]
)

export const chatConversationRelations = relations(
  chatConversation,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [chatConversation.organizationId],
      references: [organization.id],
    }),
    createdBy: one(user, {
      fields: [chatConversation.createdById],
      references: [user.id],
    }),
    messages: many(chatMessage),
  })
)

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  conversation: one(chatConversation, {
    fields: [chatMessage.conversationId],
    references: [chatConversation.id],
  }),
  organization: one(organization, {
    fields: [chatMessage.organizationId],
    references: [organization.id],
  }),
}))
