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

export const invoiceDraft = pgTable(
  "invoice_draft",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: text("status").default("draft").notNull(),
    document: jsonb("document").notNull(),
    revision: integer("revision").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("invoice_draft_organization_id_idx").on(table.organizationId),
    index("invoice_draft_status_idx").on(table.status),
  ]
)

export const invoiceSnapshot = pgTable(
  "invoice_snapshot",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    invoiceDraftId: uuid("invoice_draft_id")
      .notNull()
      .references(() => invoiceDraft.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    document: jsonb("document").notNull(),
    contentHash: text("content_hash").notNull(),
    templateId: text("template_id").notNull(),
    templateVersion: integer("template_version").notNull(),
    calculationVersion: text("calculation_version"),
    createdByUserId: uuid("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("invoice_snapshot_draft_id_idx").on(table.invoiceDraftId),
    index("invoice_snapshot_organization_id_idx").on(table.organizationId),
  ]
)

export const invoicePublicLink = pgTable(
  "invoice_public_link",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    invoiceSnapshotId: uuid("invoice_snapshot_id")
      .notNull()
      .references(() => invoiceSnapshot.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    index("invoice_public_link_snapshot_id_idx").on(table.invoiceSnapshotId),
    index("invoice_public_link_organization_id_idx").on(table.organizationId),
  ]
)

export const invoiceEvent = pgTable(
  "invoice_event",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    invoiceSnapshotId: uuid("invoice_snapshot_id")
      .notNull()
      .references(() => invoiceSnapshot.id),
    publicLinkId: uuid("public_link_id").references(() => invoicePublicLink.id),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("invoice_event_snapshot_id_idx").on(table.invoiceSnapshotId),
    index("invoice_event_public_link_id_idx").on(table.publicLinkId),
    index("invoice_event_type_idx").on(table.eventType),
  ]
)

export const invoiceDraftRelations = relations(
  invoiceDraft,
  ({ many, one }) => ({
    organization: one(organization, {
      fields: [invoiceDraft.organizationId],
      references: [organization.id],
    }),
    createdByUser: one(user, {
      fields: [invoiceDraft.createdByUserId],
      references: [user.id],
    }),
    snapshots: many(invoiceSnapshot),
  })
)

export const invoiceSnapshotRelations = relations(
  invoiceSnapshot,
  ({ many, one }) => ({
    draft: one(invoiceDraft, {
      fields: [invoiceSnapshot.invoiceDraftId],
      references: [invoiceDraft.id],
    }),
    publicLinks: many(invoicePublicLink),
    events: many(invoiceEvent),
  })
)

export const invoicePublicLinkRelations = relations(
  invoicePublicLink,
  ({ many, one }) => ({
    snapshot: one(invoiceSnapshot, {
      fields: [invoicePublicLink.invoiceSnapshotId],
      references: [invoiceSnapshot.id],
    }),
    events: many(invoiceEvent),
  })
)
