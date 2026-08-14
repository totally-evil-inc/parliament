import { relations, sql } from "drizzle-orm"
import {
  boolean,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import { organization } from "./organization"

export const aiSettings = pgTable(
  "ai_settings",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    apiKey: text("api_key"),
    baseUrl: text("base_url"),
    defaultModel: text("default_model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("ai_settings_organization_id_name_unique").on(
      t.organizationId,
      t.name
    ),
  ]
)

export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  organization: one(organization, {
    fields: [aiSettings.organizationId],
    references: [organization.id],
  }),
}))
