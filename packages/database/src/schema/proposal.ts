import { relations, sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { company } from "./company"
import { contact } from "./contact"
import { organization } from "./organization"
import { user } from "./user"

export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "archived",
])

/**
 * Proposal Entity (Phase 1 Baseline - Document-First Durability)
 */
export const proposal = pgTable(
  "proposal",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey()
      .notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => company.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contact.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: proposalStatusEnum("status").default("draft").notNull(),
    currency: text("currency").default("USD").notNull(),
    subtotalMinorUnits: integer("subtotal_minor_units").default(0).notNull(),
    taxMinorUnits: integer("tax_minor_units").default(0).notNull(),
    totalMinorUnits: integer("total_minor_units").default(0).notNull(),
    portalToken: text("portal_token"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdById: uuid("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_proposal_org").on(table.organizationId),
    index("idx_proposal_company").on(table.companyId),
    index("idx_proposal_status").on(table.status),
    index("idx_proposal_portal_token").on(table.portalToken),
  ]
)

/**
 * Immutable Proposal Version History
 */
export const proposalVersion = pgTable(
  "proposal_version",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey()
      .notNull(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposal.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    content: jsonb("content").notNull(), // Raw TipTap DocumentBlock[] array
    proposalDraft: jsonb("proposal_draft").notNull(), // Structured Zod ProposalDraft
    hash: text("hash").notNull(), // SHA-256 fingerprint of content
    createdById: uuid("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_proposal_version_lookup").on(
      table.proposalId,
      table.versionNumber
    ),
    index("idx_proposal_version_org").on(table.organizationId),
  ]
)

/**
 * Legacy Draft & Snapshot Tables (Maintained for Backward Compatibility)
 */
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
    recipientEmail: text("recipient_email"),
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
    organizationId: uuid("organization_id").references(
      () => organization.id,
      { onDelete: "cascade" }
    ),
    signerName: text("signer_name").notNull(),
    signerEmail: text("signer_email").notNull(),
    signatureText: text("signature_text"),
    signatureImage: text("signature_image"),
    otpVerified: boolean("otp_verified").notNull().default(false),
    agreedTerms: boolean("agreed_terms").notNull(),
    acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("proposal_acceptance_snapshot_id_idx").on(table.proposalSnapshotId),
    index("proposal_acceptance_public_link_id_idx").on(table.publicLinkId),
    index("proposal_acceptance_organization_id_idx").on(table.organizationId),
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
    organizationId: uuid("organization_id").references(
      () => organization.id,
      { onDelete: "cascade" }
    ),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("proposal_event_snapshot_id_idx").on(table.proposalSnapshotId),
    index("proposal_event_public_link_id_idx").on(table.publicLinkId),
    index("proposal_event_organization_id_idx").on(table.organizationId),
    index("proposal_event_type_idx").on(table.eventType),
  ]
)

export const proposalRelations = relations(proposal, ({ one, many }) => ({
  organization: one(organization, {
    fields: [proposal.organizationId],
    references: [organization.id],
  }),
  company: one(company, {
    fields: [proposal.companyId],
    references: [company.id],
  }),
  contact: one(contact, {
    fields: [proposal.contactId],
    references: [contact.id],
  }),
  versions: many(proposalVersion),
}))

export const proposalVersionRelations = relations(
  proposalVersion,
  ({ one }) => ({
    proposal: one(proposal, {
      fields: [proposalVersion.proposalId],
      references: [proposal.id],
    }),
    organization: one(organization, {
      fields: [proposalVersion.organizationId],
      references: [organization.id],
    }),
  })
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

export const proposalAcceptanceRelations = relations(
  proposalAcceptance,
  ({ one }) => ({
    proposalSnapshot: one(proposalSnapshot, {
      fields: [proposalAcceptance.proposalSnapshotId],
      references: [proposalSnapshot.id],
    }),
    publicLink: one(proposalPublicLink, {
      fields: [proposalAcceptance.publicLinkId],
      references: [proposalPublicLink.id],
    }),
    organization: one(organization, {
      fields: [proposalAcceptance.organizationId],
      references: [organization.id],
    }),
  })
)

export const proposalEventRelations = relations(proposalEvent, ({ one }) => ({
  proposalSnapshot: one(proposalSnapshot, {
    fields: [proposalEvent.proposalSnapshotId],
    references: [proposalSnapshot.id],
  }),
  publicLink: one(proposalPublicLink, {
    fields: [proposalEvent.publicLinkId],
    references: [proposalPublicLink.id],
  }),
  organization: one(organization, {
    fields: [proposalEvent.organizationId],
    references: [organization.id],
  }),
}))
