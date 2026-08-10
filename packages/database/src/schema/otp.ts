import { sql } from "drizzle-orm"
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const publicLinkOtp = pgTable(
  "public_link_otp",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey().notNull(),
    publicLinkId: uuid("public_link_id").notNull(),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("public_link_otp_public_link_id_idx").on(table.publicLinkId),
    index("public_link_otp_email_idx").on(table.email),
  ]
)
