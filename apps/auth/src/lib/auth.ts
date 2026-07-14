import { db } from "@workspace/database"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { jwt, organization } from "better-auth/plugins"

import { trustedOrigins } from "./utils"

const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN
const authServerUrl = process.env.AUTH_SERVER_URL ?? "http://localhost:4000"
const apiServerUrl = process.env.API_SERVER_URL ?? "http://localhost:8080"

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
    ...(authCookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: authCookieDomain,
          },
        }
      : {}),
  },
  trustedOrigins,

  /**
   * Plugins
   */
  plugins: [
    organization(),
    jwt({
      jwt: {
        issuer: authServerUrl,
        audience: apiServerUrl,
        expirationTime: "15m",
        definePayload: ({ user, session }) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          org_id: session.activeOrganizationId ?? null,
          sid: session.id,
        }),
      },
    }),
  ],
})
