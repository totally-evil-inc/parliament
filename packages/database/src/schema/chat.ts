import type { MessagePartJson } from "@workspace/agent/message-parts"
import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
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

/**
 * Durable Human-In-The-Loop action approvals.
 * Persists pending mutations (e.g. document sends, external actions)
 * with cryptographic expiration and multi-session resume capability.
 */
export const chatActionApproval = pgTable(
  "chat_action_approval",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversation.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => chatMessage.id, {
      onDelete: "cascade",
    }),
    toolName: text("tool_name").notNull(),
    toolArgs: jsonb("tool_args")
      .$type<Record<string, unknown>>()
      .notNull(),
    summary: text("summary").notNull(),
    status: text("status")
      .$type<"pending" | "approved" | "rejected" | "expired">()
      .default("pending")
      .notNull(),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resolutionFeedback: text("resolution_feedback"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_action_org_status_idx").on(table.organizationId, table.status),
    index("chat_action_conv_idx").on(table.conversationId),
  ]
)

/**
 * Context overflow spillover artifacts.
 * Stores large tool outputs (logs, ASTs, tabular dumps) with pointers
 * so the context window remains compact and cache-friendly.
 */
export const chatArtifact = pgTable(
  "chat_artifact",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversation.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mimeType: text("mime_type").default("text/plain").notNull(),
    content: text("content").notNull(),
    byteSize: integer("byte_size").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_artifact_conv_idx").on(table.conversationId),
    index("chat_artifact_org_idx").on(table.organizationId),
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
    approvals: many(chatActionApproval),
    artifacts: many(chatArtifact),
  })
)

export const chatMessageRelations = relations(chatMessage, ({ one, many }) => ({
  conversation: one(chatConversation, {
    fields: [chatMessage.conversationId],
    references: [chatConversation.id],
  }),
  organization: one(organization, {
    fields: [chatMessage.organizationId],
    references: [organization.id],
  }),
  approvals: many(chatActionApproval),
}))

export const chatActionApprovalRelations = relations(
  chatActionApproval,
  ({ one }) => ({
    conversation: one(chatConversation, {
      fields: [chatActionApproval.conversationId],
      references: [chatConversation.id],
    }),
    organization: one(organization, {
      fields: [chatActionApproval.organizationId],
      references: [organization.id],
    }),
    message: one(chatMessage, {
      fields: [chatActionApproval.messageId],
      references: [chatMessage.id],
    }),
    resolvedBy: one(user, {
      fields: [chatActionApproval.resolvedByUserId],
      references: [user.id],
    }),
  })
)

export const chatArtifactRelations = relations(chatArtifact, ({ one }) => ({
  conversation: one(chatConversation, {
    fields: [chatArtifact.conversationId],
    references: [chatConversation.id],
  }),
  organization: one(organization, {
    fields: [chatArtifact.organizationId],
    references: [organization.id],
  }),
}))
