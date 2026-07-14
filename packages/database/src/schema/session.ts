import { relations, sql } from "drizzle-orm"
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { organization } from "./organization"
import { user } from "./user"

export const session = pgTable(
  "session",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: uuid("active_organization_id").references(
      () => organization.id,
      { onDelete: "set null" }
    ),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
)

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
  activeOrganization: one(organization, {
    fields: [session.activeOrganizationId],
    references: [organization.id],
  }),
}))
