import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { jwt, organization } from "better-auth/plugins"
import { db } from "@workspace/database"

import { trustedOrigins } from "./utils"

export const auth = betterAuth({
  /**
   * Database Configuration
   */
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  /**
   * Authentication Methods
   */
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      prompt: "select_account consent",
      accessType: "offline",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  /**
   * Security & Advanced
   */
  advanced: {
    database: {
      generateId: false,
    },
  },
  trustedOrigins,

  /**
   * Plugins
   */
  plugins: [organization(), jwt()],
})
