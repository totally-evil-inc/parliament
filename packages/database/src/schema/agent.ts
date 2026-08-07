import { relations, sql } from "drizzle-orm"
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { organization } from "./organization"
import { user } from "./user"

export const agent = pgTable("agent", {
  id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").references(() => organization.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  secretHash: text("secret_hash"),
  policy:
    jsonb("policy").$type<
      Record<string, "always_allow" | "require_approval" | "forbidden">
    >(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .defaultNow()
    .notNull(),
}, (table) => [
  index("agent_user_id_idx").on(table.userId),
  index("agent_org_id_idx").on(table.orgId),
])

export const agentRelations = relations(agent, ({ one }) => ({
  user: one(user, {
    fields: [agent.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [agent.orgId],
    references: [organization.id],
  }),
}))
