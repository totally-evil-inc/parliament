import { db } from "@workspace/database"
import { logger } from "@workspace/logger"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { genericOAuth, jwt, magicLink, organization } from "better-auth/plugins"

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
  onError: (error: unknown, ctx: { request?: { url?: string } }) => {
    logger.error(
      { err: error, path: ctx.request?.url },
      "Better Auth error occurred"
    )
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
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scope: ["repo", "read:org", "user"],
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
          const commandUrl =
            Bun.env.COMMAND_SERVER_URL ?? "http://localhost:3000"
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
          logger.error(
            { err, email: data.email },
            "Failed to render or send invitation email"
          )
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
          logger.error(
            { err, email },
            "Failed to render or send magic link email"
          )
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
    genericOAuth({
      config: [
        {
          providerId: "gmail",
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          authorizationUrl:
            "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline",
          tokenUrl: "https://oauth2.googleapis.com/token",
          scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.metadata",
          ],
        },
        {
          providerId: "google-calendar",
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          authorizationUrl:
            "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline",
          tokenUrl: "https://oauth2.googleapis.com/token",
          scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/calendar.events.readonly",
          ],
        },
        {
          providerId: "google-drive",
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          authorizationUrl:
            "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline",
          tokenUrl: "https://oauth2.googleapis.com/token",
          scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/drive.file",
          ],
        },
        {
          providerId: "linear",
          clientId: process.env.LINEAR_CLIENT_ID as string,
          clientSecret: process.env.LINEAR_CLIENT_SECRET as string,
          authorizationUrl: "https://linear.app/oauth/authorize",
          tokenUrl: "https://api.linear.app/oauth/token",
          scopes: ["read", "write"],
        },
        {
          providerId: "notion",
          clientId: process.env.NOTION_CLIENT_ID as string,
          clientSecret: process.env.NOTION_CLIENT_SECRET as string,
          authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
          tokenUrl: "https://api.notion.com/v1/oauth/token",
          scopes: ["read_content"],
        },
      ],
    }),
  ],
})
