import { relations, sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { invitation } from "./invitation"
import { member } from "./member"

export const organization = pgTable("organization", {
  id: uuid("id")
    .default(sql`uuidv7()`)
    .primaryKey()
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").notNull(),
  metadata: text("metadata"),
})

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
}))
