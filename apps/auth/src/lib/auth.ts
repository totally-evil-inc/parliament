import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { db } from "@workspace/database"

import { trustedOrigins } from "./utils"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  advanced: {
    database: {
      generateId: false,
    },
  },
  trustedOrigins,

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    organization()
  ]
})
