import { relations, sql } from "drizzle-orm"
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { company } from "./company"
import { organization } from "./organization"

export const contact = pgTable(
  "contact",
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
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    title: text("title"),
    role: text("role"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_contact_org").on(table.organizationId),
    index("idx_contact_email").on(table.organizationId, table.email),
    index("idx_contact_company").on(table.companyId),
  ]
)

export const contactRelations = relations(contact, ({ one }) => ({
  organization: one(organization, {
    fields: [contact.organizationId],
    references: [organization.id],
  }),
  company: one(company, {
    fields: [contact.companyId],
    references: [company.id],
  }),
}))
