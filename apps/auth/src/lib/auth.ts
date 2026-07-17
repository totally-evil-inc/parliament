import { db } from "@workspace/database"
import { logger } from "@workspace/logger"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { jwt, organization, magicLink } from "better-auth/plugins"

import { renderEmail, sendEmail } from "./email"
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
   * Global Error Logger
   */
  onError: (error: any, ctx: any) => {
    logger.error({ err: error, path: ctx.request.url }, "Better Auth error occurred")
  },

  /**
   * Authentication Methods
   */
  emailAndPassword: {
    enabled: false,
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
    organization({
      async sendInvitationEmail(data) {
        try {
          const commandUrl = Bun.env.COMMAND_SERVER_URL ?? "http://localhost:3000"
          const inviteUrl = `${commandUrl}/auth/invite/accept?id=${data.invitation.id}&email=${encodeURIComponent(data.email)}&orgName=${encodeURIComponent(data.organization.name)}`
          const html = await renderEmail("invitation", {
            url: inviteUrl,
            orgName: data.organization.name,
            inviterName: data.inviter.user.name || data.inviter.user.email,
            email: data.email,
          })
          await sendEmail({
            to: data.email,
            subject: `Join ${data.organization.name} on Parliament`,
            html,
          })
        } catch (err) {
          logger.error({ err, email: data.email }, "Failed to render or send invitation email")
          throw err
        }
      },
    }),
    magicLink({
      async sendMagicLink({ email, url }) {
        try {
          const html = await renderEmail("magic-link", {
            url,
            email,
          })
          await sendEmail({
            to: email,
            subject: "Sign in to Parliament",
            html,
          })
        } catch (err) {
          logger.error({ err, email }, "Failed to render or send magic link email")
          throw err
        }
      },
    }),
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
