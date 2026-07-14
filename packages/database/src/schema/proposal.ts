import { relations, sql } from "drizzle-orm"
import {
  boolean,
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

export const proposalDraft = pgTable(
  "proposal_draft",
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
    index("proposal_draft_organization_id_idx").on(table.organizationId),
    index("proposal_draft_status_idx").on(table.status),
  ]
)

export const proposalSnapshot = pgTable(
  "proposal_snapshot",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    proposalDraftId: uuid("proposal_draft_id")
      .notNull()
      .references(() => proposalDraft.id),
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
    index("proposal_snapshot_draft_id_idx").on(table.proposalDraftId),
    index("proposal_snapshot_organization_id_idx").on(table.organizationId),
  ]
)

export const proposalPublicLink = pgTable(
  "proposal_public_link",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    proposalSnapshotId: uuid("proposal_snapshot_id")
      .notNull()
      .references(() => proposalSnapshot.id),
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
    index("proposal_public_link_snapshot_id_idx").on(table.proposalSnapshotId),
    index("proposal_public_link_organization_id_idx").on(table.organizationId),
  ]
)

export const proposalAcceptance = pgTable(
  "proposal_acceptance",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    proposalSnapshotId: uuid("proposal_snapshot_id")
      .notNull()
      .references(() => proposalSnapshot.id),
    publicLinkId: uuid("public_link_id")
      .notNull()
      .references(() => proposalPublicLink.id),
    signerName: text("signer_name").notNull(),
    signerEmail: text("signer_email").notNull(),
    signatureText: text("signature_text"),
    agreedTerms: boolean("agreed_terms").notNull(),
    acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("proposal_acceptance_snapshot_id_idx").on(table.proposalSnapshotId),
    index("proposal_acceptance_public_link_id_idx").on(table.publicLinkId),
  ]
)

export const proposalEvent = pgTable(
  "proposal_event",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    proposalSnapshotId: uuid("proposal_snapshot_id")
      .notNull()
      .references(() => proposalSnapshot.id),
    publicLinkId: uuid("public_link_id").references(
      () => proposalPublicLink.id
    ),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("proposal_event_snapshot_id_idx").on(table.proposalSnapshotId),
    index("proposal_event_public_link_id_idx").on(table.publicLinkId),
    index("proposal_event_type_idx").on(table.eventType),
  ]
)

export const proposalDraftRelations = relations(
  proposalDraft,
  ({ many, one }) => ({
    organization: one(organization, {
      fields: [proposalDraft.organizationId],
      references: [organization.id],
    }),
    createdByUser: one(user, {
      fields: [proposalDraft.createdByUserId],
      references: [user.id],
    }),
    snapshots: many(proposalSnapshot),
  })
)

export const proposalSnapshotRelations = relations(
  proposalSnapshot,
  ({ many, one }) => ({
    draft: one(proposalDraft, {
      fields: [proposalSnapshot.proposalDraftId],
      references: [proposalDraft.id],
    }),
    publicLinks: many(proposalPublicLink),
    acceptances: many(proposalAcceptance),
    events: many(proposalEvent),
  })
)

export const proposalPublicLinkRelations = relations(
  proposalPublicLink,
  ({ many, one }) => ({
    snapshot: one(proposalSnapshot, {
      fields: [proposalPublicLink.proposalSnapshotId],
      references: [proposalSnapshot.id],
    }),
    acceptances: many(proposalAcceptance),
    events: many(proposalEvent),
  })
)
