import { relations, sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { organization } from "./organization"

export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "lead",
  "inactive",
  "churned",
])

export const company = pgTable(
  "company",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey()
      .notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    billingEmail: text("billing_email"),
    phone: text("phone"),
    website: text("website"),
    domain: text("domain"),
    vatNumber: text("vat_number"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    country: text("country"),
    note: text("note"),
    status: customerStatusEnum("status").default("active").notNull(),
    preferredCurrency: text("preferred_currency").default("USD").notNull(),
    defaultPaymentTerms: integer("default_payment_terms").default(30).notNull(),
    logoUrl: text("logo_url"),
    industry: text("industry"),
    employeeCount: text("employee_count"),
    linkedinUrl: text("linkedin_url"),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_company_org").on(table.organizationId),
    index("idx_company_domain").on(table.domain),
    index("idx_company_status").on(table.status),
  ]
)

export const companyRelations = relations(company, ({ one }) => ({
  organization: one(organization, {
    fields: [company.organizationId],
    references: [organization.id],
  }),
}))
