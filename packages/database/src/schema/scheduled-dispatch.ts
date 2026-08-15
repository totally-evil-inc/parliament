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

export const scheduledDocumentDispatch = pgTable(
  "scheduled_document_dispatch",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(), // "proposal" | "invoice"
    documentId: uuid("document_id").notNull(), // proposalDraft.id or invoiceDraft.id
    documentTitle: text("document_title").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    ccRecipients: jsonb("cc_recipients").$type<string[]>().default([]),
    bccRecipients: jsonb("bcc_recipients").$type<string[]>().default([]),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: text("status").default("pending").notNull(), // "pending" | "processing" | "sent" | "cancelled" | "failed"
    sendMethod: text("send_method").default("gmail").notNull(), // "gmail" | "smtp_resend"
    lastError: text("last_error"),
    attempts: integer("attempts").default(0).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_scheduled_dispatch_due").on(table.status, table.scheduledFor),
    index("idx_scheduled_dispatch_doc").on(
      table.organizationId,
      table.documentType,
      table.documentId
    ),
    index("idx_scheduled_dispatch_user").on(table.userId),
    index("idx_scheduled_dispatch_org").on(table.organizationId),
  ]
)

export const scheduledDocumentDispatchRelations = relations(
  scheduledDocumentDispatch,
  ({ one }) => ({
    organization: one(organization, {
      fields: [scheduledDocumentDispatch.organizationId],
      references: [organization.id],
    }),
    user: one(user, {
      fields: [scheduledDocumentDispatch.userId],
      references: [user.id],
    }),
  })
)
