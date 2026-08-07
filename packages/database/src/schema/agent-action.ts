import { relations, sql } from "drizzle-orm"
import {
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { agent } from "./agent"
import { user } from "./user"

export const agentAction = pgTable("agent_action", {
  id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agent.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  toolName: text("tool_name").notNull(),
  args: jsonb("args").notNull(),
  reason: text("reason").notNull(),
  confidenceScore: real("confidence_score").default(0.9).notNull(),
  status: text("status")
    .$type<"pending" | "approved" | "rejected" | "expired">()
    .default("pending")
    .notNull(),
  approvedAt: timestamp("approved_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .defaultNow()
    .notNull(),
})

export const agentActionRelations = relations(agentAction, ({ one }) => ({
  agent: one(agent, {
    fields: [agentAction.agentId],
    references: [agent.id],
  }),
  user: one(user, {
    fields: [agentAction.userId],
    references: [user.id],
  }),
}))
