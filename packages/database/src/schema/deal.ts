import { relations, sql } from "drizzle-orm"
import {
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
import { proposal } from "./proposal"
import { user } from "./user"

export const dealStageEnum = pgEnum("deal_stage", [
  "lead",
  "discovery",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost",
])

export const deal = pgTable(
  "deal",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => company.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contact.id, {
      onDelete: "set null",
    }),
    proposalId: uuid("proposal_id").references(() => proposal.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    stage: dealStageEnum("stage").default("lead").notNull(),
    valueMinorUnits: integer("value_minor_units").default(0).notNull(),
    currency: text("currency").default("USD").notNull(),
    expectedCloseDate: text("expected_close_date"),
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
    index("idx_deal_org").on(table.organizationId),
    index("idx_deal_company").on(table.companyId),
    index("idx_deal_stage").on(table.stage),
  ]
)

export const clientTask = pgTable(
  "client_task",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deal.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    status: text("status").default("pending").notNull(),
    dueDate: text("due_date"),
    assignedToId: uuid("assigned_to_id").references(() => user.id, {
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
    index("idx_client_task_org").on(table.organizationId),
    index("idx_client_task_deal").on(table.dealId),
  ]
)

export const clientActivity = pgTable(
  "client_activity",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deal.id, {
      onDelete: "cascade",
    }),
    activityType: text("activity_type").notNull(),
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdById: uuid("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_client_activity_org").on(table.organizationId),
    index("idx_client_activity_deal").on(table.dealId),
  ]
)

export const dealRelations = relations(deal, ({ one, many }) => ({
  organization: one(organization, {
    fields: [deal.organizationId],
    references: [organization.id],
  }),
  company: one(company, {
    fields: [deal.companyId],
    references: [company.id],
  }),
  contact: one(contact, {
    fields: [deal.contactId],
    references: [contact.id],
  }),
  proposal: one(proposal, {
    fields: [deal.proposalId],
    references: [proposal.id],
  }),
  tasks: many(clientTask),
  activities: many(clientActivity),
}))

export const clientTaskRelations = relations(clientTask, ({ one }) => ({
  organization: one(organization, {
    fields: [clientTask.organizationId],
    references: [organization.id],
  }),
  deal: one(deal, {
    fields: [clientTask.dealId],
    references: [deal.id],
  }),
  assignedTo: one(user, {
    fields: [clientTask.assignedToId],
    references: [user.id],
  }),
}))

export const clientActivityRelations = relations(clientActivity, ({ one }) => ({
  organization: one(organization, {
    fields: [clientActivity.organizationId],
    references: [organization.id],
  }),
  deal: one(deal, {
    fields: [clientActivity.dealId],
    references: [deal.id],
  }),
  createdBy: one(user, {
    fields: [clientActivity.createdById],
    references: [user.id],
  }),
}))
