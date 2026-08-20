import { and, db, desc, eq } from "@workspace/database"
import { account } from "@workspace/database/schema"
import { Hono } from "hono"
import { z } from "zod"
import { auth } from "../lib/auth"
import {
  IntegrationNotConnectedError,
  OAuthConfigMissingError,
  TokenRefreshError,
} from "../lib/oauth/errors"
import {
  type SupportedGoogleProvider,
  googleTokenService,
} from "../lib/oauth/google-token-service"
import { bearerSecretMatch } from "../lib/utils"

function truncateDescription(
  desc: unknown,
  maxLength = 200
): string | undefined {
  if (typeof desc !== "string") return undefined
  const cleaned = desc.replace(/[\r\n\t]+/g, " ").trim()
  if (cleaned.length === 0) return undefined
  return cleaned.length > maxLength
    ? `${cleaned.slice(0, maxLength)}...`
    : cleaned
}

export function createIntegrationsRouter(
  customDb: typeof db = db,
  customTokenService: typeof googleTokenService = googleTokenService
) {
  const router = new Hono<{
    Variables: {
      user: { id: string; email: string } | null
      session: { id: string } | null
      requestId?: string
      logContext?: Record<string, unknown>
    }
  }>()

  /**
   * List connected integration accounts for the authenticated user
   */
  router.get("/list", async (c) => {
    const user = c.get("user")
    const logContext = c.get("logContext")
    if (logContext) {
      logContext.operation = "list_integration_accounts"
      logContext.user_id = user?.id ?? null
    }

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    try {
      const userAccounts = await customDb
        .select({
          id: account.id,
          providerId: account.providerId,
          accountId: account.accountId,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        })
        .from(account)
        .where(eq(account.userId, user.id))

      if (logContext) {
        logContext.account_count = userAccounts.length
      }
      return c.json({ accounts: userAccounts })
    } catch (err: unknown) {
      return c.json({ error: "Failed to fetch integration accounts" }, 500)
    }
  })

  const disconnectSchema = z.object({
    accountId: z.string().trim().min(1, "accountId is required"),
    providerId: z.string().trim().min(1).optional(),
  })

  /**
   * Disconnect/Unlink integration account for the authenticated user via Better Auth API.
   * Requires the internal Better Auth account record ID (account.id) to guarantee unambiguous unlinking.
   */
  router.post("/disconnect", async (c) => {
    const user = c.get("user")
    const logContext = c.get("logContext")
    if (logContext) {
      logContext.operation = "account_unlink"
      logContext.user_id = user?.id ?? null
    }

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const rawBody = await c.req.json().catch(() => ({}))
    const parseResult = disconnectSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return c.json(
        {
          error: "Bad Request: accountId is required",
          code: "INVALID_REQUEST",
        },
        400
      )
    }

    const { accountId, providerId } = parseResult.data
    if (logContext) {
      logContext.account_id = accountId
      if (providerId) logContext.provider_id = providerId
    }

    // Strictly verify account exists and belongs to the authenticated user (tenant isolation)
    const userAccounts = await customDb
      .select()
      .from(account)
      .where(and(eq(account.id, accountId), eq(account.userId, user.id)))
      .limit(1)

    if (!userAccounts || userAccounts.length === 0) {
      return c.json(
        {
          error: "Integration account not found or already disconnected",
          code: "ACCOUNT_NOT_FOUND",
        },
        404
      )
    }

    const targetAccount = userAccounts[0]
    if (logContext) {
      logContext.provider_id = targetAccount.providerId
    }

    try {
      const result = await auth.api.unlinkAccount({
        headers: c.req.raw.headers,
        body: {
          providerId: targetAccount.providerId,
          accountId: targetAccount.accountId,
        },
      })

      return c.json({ success: true, result })
    } catch (unlinkErr: any) {
      const rawCode = unlinkErr?.code || "UNLINK_FAILED"
      const isApiError =
        typeof unlinkErr?.status === "number" &&
        unlinkErr.status >= 400 &&
        unlinkErr.status < 600
      const status = isApiError ? unlinkErr.status : 500

      let safeMessage = "Failed to disconnect integration account"
      let safeCode = rawCode

      if (rawCode === "ACCOUNT_NOT_FOUND") {
        safeMessage = "Integration account not found or already disconnected"
        safeCode = "ACCOUNT_NOT_FOUND"
      } else if (rawCode === "FAILED_TO_UNLINK_LAST_ACCOUNT") {
        safeMessage = "Cannot unlink the primary authentication account"
        safeCode = "FAILED_TO_UNLINK_LAST_ACCOUNT"
      } else if (status >= 500) {
        safeMessage = "Internal error processing account disconnection"
        safeCode = "INTERNAL_ERROR"
      }

      if (logContext) {
        logContext.error_code = safeCode
      }

      return c.json(
        {
          error: safeMessage,
          code: safeCode,
        },
        status
      )
    }
  })

  /**
   * Internal endpoint for the Parliament Agent runtime to retrieve a valid OAuth access token for an integration provider.
   * Secured via X-Agent-Secret header, Authorization header, or BETTER_AUTH_SECRET / AGENT_AUTH_SECRET matching.
   * Requires both provider and userId strictly to avoid any multi-tenant cross-account token leaks.
   */
  router.get("/internal/token", async (c) => {
    const logContext = c.get("logContext")
    if (logContext) {
      logContext.operation = "internal_token"
    }

    const rawAuthHeader = c.req.header("authorization") || ""
    const secretHeader =
      c.req.header("x-agent-secret") ||
      (rawAuthHeader.toLowerCase().startsWith("bearer ")
        ? rawAuthHeader.slice(7)
        : rawAuthHeader)

    const agentSecret = process.env.AGENT_AUTH_SECRET
    const betterAuthSecret = process.env.BETTER_AUTH_SECRET

    if (!agentSecret && !betterAuthSecret) {
      if (logContext) logContext.auth_result = "service_unavailable"
      return c.json(
        { error: "Service Unavailable: Agent auth secret is not configured" },
        503
      )
    }

    const isAuthorized =
      (agentSecret ? bearerSecretMatch(secretHeader, agentSecret) : false) ||
      (betterAuthSecret
        ? bearerSecretMatch(secretHeader, betterAuthSecret)
        : false)

    if (!isAuthorized) {
      if (logContext) logContext.auth_result = "forbidden"
      return c.json(
        { error: "Forbidden: Invalid agent authorization secret" },
        403
      )
    }

    if (logContext) logContext.auth_result = "authorized"

    const provider = c.req.query("provider")?.trim() ?? null
    const userId = c.req.query("userId")?.trim() ?? null

    if (logContext) {
      logContext.provider_id = provider
      logContext.user_id = userId
    }

    if (!provider) {
      return c.json({ error: "Bad Request: Missing provider parameter" }, 400)
    }

    if (!userId) {
      return c.json(
        { error: "Bad Request: Missing or invalid userId parameter" },
        400
      )
    }

    const isGoogleProvider = [
      "google",
      "gmail",
      "google-calendar",
      "google-drive",
    ].includes(provider)

    if (isGoogleProvider) {
      try {
        const details = await customTokenService.getValidTokenDetails(
          userId,
          provider as SupportedGoogleProvider,
          c.get("requestId")
        )

        if (logContext) logContext.account_id = details.accountId

        return c.json({
          success: true,
          provider: details.providerId,
          accessToken: details.accessToken,
          expiresAt: details.expiresAt,
          userId,
        })
      } catch (err: unknown) {
        if (err instanceof IntegrationNotConnectedError) {
          return c.json(
            { error: `No account connected for provider: ${provider}` },
            404
          )
        }
        if (err instanceof TokenRefreshError) {
          if (logContext) {
            if (err.providerErrorCode)
              logContext.provider_error_code = err.providerErrorCode
            if (err.httpStatus !== undefined)
              logContext.provider_http_status = err.httpStatus
            if (err.providerDescription) {
              logContext.provider_description_truncated = truncateDescription(
                err.providerDescription
              )
            }
          }
          return c.json(
            {
              error: err.message,
              providerErrorCode: err.providerErrorCode,
            },
            502
          )
        }
        if (err instanceof OAuthConfigMissingError) {
          return c.json({ error: err.message }, 500)
        }
        throw err
      }
    }

    // Generic / non-Google provider lookup (strictly scoped to specific userId and provider)
    const records = await customDb
      .select()
      .from(account)
      .where(and(eq(account.providerId, provider), eq(account.userId, userId)))
      .orderBy(desc(account.updatedAt))

    if (!records || records.length === 0) {
      return c.json(
        { error: `No account connected for provider: ${provider}` },
        404
      )
    }

    const targetAccount = records[0]

    if (!targetAccount.accessToken) {
      return c.json(
        { error: `No active token found for provider: ${provider}` },
        404
      )
    }

    if (logContext) logContext.account_id = targetAccount.id

    return c.json({
      success: true,
      provider: targetAccount.providerId,
      accessToken: targetAccount.accessToken,
      expiresAt: targetAccount.accessTokenExpiresAt,
      userId: targetAccount.userId,
    })
  })

  return router
}

export const integrationsRouter = createIntegrationsRouter()



