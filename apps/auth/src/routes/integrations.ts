import { and, db, desc, eq } from "@workspace/database"
import { account } from "@workspace/database/schema"
import { logger } from "@workspace/logger"
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

export const integrationsRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: { id: string } | null
    requestId?: string
  }
}>()

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

/**
 * List connected integration accounts for the authenticated user
 */
integrationsRouter.get("/list", async (c) => {
  const startTime = Date.now()
  const requestId =
    c.get("requestId") || c.req.header("x-request-id") || crypto.randomUUID()
  const user = c.get("user")

  const wideEvent: Record<string, unknown> = {
    operation: "list_integration_accounts",
    request_id: requestId,
    user_id: user?.id ?? null,
    status_code: 200,
    outcome: "success",
    timestamp: new Date().toISOString(),
  }

  try {
    if (!user) {
      wideEvent.status_code = 401
      wideEvent.outcome = "failure"
      wideEvent.error_code = "UNAUTHORIZED"
      return c.json({ error: "Unauthorized" }, 401)
    }

    const userAccounts = await db
      .select({
        id: account.id,
        providerId: account.providerId,
        accountId: account.accountId,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })
      .from(account)
      .where(eq(account.userId, user.id))

    wideEvent.account_count = userAccounts.length
    return c.json({ accounts: userAccounts })
  } catch (err: unknown) {
    wideEvent.status_code = 500
    wideEvent.outcome = "error"
    wideEvent.error = {
      name: err instanceof Error ? err.name : "UnknownError",
      message: err instanceof Error ? err.message : String(err),
    }
    return c.json({ error: "Failed to fetch integration accounts" }, 500)
  } finally {
    wideEvent.duration_ms = Date.now() - startTime
    if (wideEvent.outcome === "error") {
      logger.error(wideEvent, "Fetch user integration accounts failed")
    } else {
      logger.info(wideEvent, "Fetch user integration accounts completed")
    }
  }
})

const disconnectSchema = z.object({
  providerId: z.string().trim().min(1, "providerId is required"),
  accountId: z.string().trim().min(1).optional(),
})

/**
 * Disconnect/Unlink integration account for the authenticated user via Better Auth API.
 */
integrationsRouter.post("/disconnect", async (c) => {
  const startTime = Date.now()
  const requestId =
    c.get("requestId") || c.req.header("x-request-id") || crypto.randomUUID()
  const user = c.get("user")

  const wideEvent: Record<string, unknown> = {
    operation: "account_unlink",
    request_id: requestId,
    user_id: user?.id ?? null,
    provider_id: null,
    account_id: null,
    status_code: 200,
    outcome: "success",
    timestamp: new Date().toISOString(),
  }

  try {
    if (!user) {
      wideEvent.status_code = 401
      wideEvent.outcome = "failure"
      wideEvent.error_code = "UNAUTHORIZED"
      return c.json({ error: "Unauthorized" }, 401)
    }

    const rawBody = await c.req.json().catch(() => ({}))
    const parseResult = disconnectSchema.safeParse(rawBody)

    if (!parseResult.success) {
      wideEvent.status_code = 400
      wideEvent.outcome = "failure"
      wideEvent.error_code = "INVALID_REQUEST"
      return c.json(
        {
          error: "Bad Request: providerId is required",
          code: "INVALID_REQUEST",
        },
        400
      )
    }

    const { providerId, accountId } = parseResult.data
    wideEvent.provider_id = providerId
    wideEvent.account_id = accountId ?? null

    try {
      const result = await auth.api.unlinkAccount({
        headers: c.req.raw.headers,
        body: {
          providerId,
          ...(accountId ? { accountId } : {}),
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

      wideEvent.status_code = status
      wideEvent.outcome = status >= 500 ? "error" : "failure"
      wideEvent.error_code = safeCode
      if (status >= 500) {
        wideEvent.error = {
          name: unlinkErr instanceof Error ? unlinkErr.name : "UnlinkError",
          message:
            unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr),
        }
      }

      return c.json(
        {
          error: safeMessage,
          code: safeCode,
        },
        status
      )
    }
  } catch (err: unknown) {
    wideEvent.status_code = 500
    wideEvent.outcome = "error"
    wideEvent.error = {
      name: err instanceof Error ? err.name : "UnknownError",
      message: err instanceof Error ? err.message : String(err),
    }
    return c.json({ error: "Failed to disconnect integration account" }, 500)
  } finally {
    wideEvent.duration_ms = Date.now() - startTime
    if (wideEvent.outcome === "error") {
      logger.error(wideEvent, "Disconnect integration account failed")
    } else {
      logger.info(wideEvent, "Disconnect integration account completed")
    }
  }
})

/**
 * Internal endpoint for the Parliament Agent runtime to retrieve a valid OAuth access token for an integration provider.
 * Secured via X-Agent-Secret header, Authorization header, or BETTER_AUTH_SECRET / AGENT_AUTH_SECRET matching.
 * Requires both provider and userId strictly to avoid any multi-tenant cross-account token leaks.
 */
integrationsRouter.get("/internal/token", async (c) => {
  const startTime = Date.now()
  const requestId =
    c.get("requestId") || c.req.header("x-request-id") || crypto.randomUUID()
  const provider = c.req.query("provider")?.trim() ?? null
  const userId = c.req.query("userId")?.trim() ?? null

  const wideEvent: Record<string, unknown> = {
    operation: "internal_token",
    request_id: requestId,
    provider_id: provider,
    user_id: userId,
    auth_result: "authorized",
    status_code: 200,
    outcome: "success",
    timestamp: new Date().toISOString(),
  }

  try {
    const rawAuthHeader = c.req.header("authorization") || ""
    const secretHeader =
      c.req.header("x-agent-secret") ||
      (rawAuthHeader.toLowerCase().startsWith("bearer ")
        ? rawAuthHeader.slice(7)
        : rawAuthHeader)

    const agentSecret = process.env.AGENT_AUTH_SECRET
    const betterAuthSecret = process.env.BETTER_AUTH_SECRET

    if (!agentSecret && !betterAuthSecret) {
      wideEvent.auth_result = "service_unavailable"
      wideEvent.status_code = 503
      wideEvent.outcome = "error"
      wideEvent.error_code = "SECRET_NOT_CONFIGURED"
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
      wideEvent.auth_result = "forbidden"
      wideEvent.status_code = 403
      wideEvent.outcome = "failure"
      wideEvent.error_code = "FORBIDDEN"
      return c.json(
        { error: "Forbidden: Invalid agent authorization secret" },
        403
      )
    }

    if (!provider) {
      wideEvent.status_code = 400
      wideEvent.outcome = "failure"
      wideEvent.error_code = "MISSING_PROVIDER"
      return c.json({ error: "Bad Request: Missing provider parameter" }, 400)
    }

    if (!userId) {
      wideEvent.status_code = 400
      wideEvent.outcome = "failure"
      wideEvent.error_code = "MISSING_USER_ID"
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
        const details = await googleTokenService.getValidTokenDetails(
          userId,
          provider as SupportedGoogleProvider
        )

        wideEvent.account_id = details.accountId

        return c.json({
          success: true,
          provider: details.providerId,
          accessToken: details.accessToken,
          expiresAt: details.expiresAt,
          userId,
        })
      } catch (err: unknown) {
        if (err instanceof IntegrationNotConnectedError) {
          wideEvent.status_code = 404
          wideEvent.outcome = "failure"
          wideEvent.error_code = err.code
          return c.json(
            { error: `No account connected for provider: ${provider}` },
            404
          )
        }
        if (err instanceof TokenRefreshError) {
          wideEvent.status_code = 502
          wideEvent.outcome = "error"
          wideEvent.error_code = err.code
          if (err.providerErrorCode) {
            wideEvent.provider_error_code = err.providerErrorCode
          }
          if (err.httpStatus !== undefined) {
            wideEvent.provider_http_status = err.httpStatus
          }
          if (err.providerDescription) {
            wideEvent.provider_description_truncated = truncateDescription(
              err.providerDescription
            )
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
          wideEvent.status_code = 500
          wideEvent.outcome = "error"
          wideEvent.error_code = err.code
          return c.json({ error: err.message }, 500)
        }
        throw err
      }
    }

    // Generic / non-Google provider lookup (strictly scoped to specific userId and provider)
    const records = await db
      .select()
      .from(account)
      .where(
        and(eq(account.providerId, provider), eq(account.userId, userId))
      )
      .orderBy(desc(account.updatedAt))

    if (!records || records.length === 0) {
      wideEvent.status_code = 404
      wideEvent.outcome = "failure"
      wideEvent.error_code = "INTEGRATION_NOT_CONNECTED"
      return c.json(
        { error: `No account connected for provider: ${provider}` },
        404
      )
    }

    const targetAccount = records[0]

    if (!targetAccount.accessToken) {
      wideEvent.status_code = 404
      wideEvent.outcome = "failure"
      wideEvent.error_code = "TOKEN_NOT_FOUND"
      return c.json(
        { error: `No active token found for provider: ${provider}` },
        404
      )
    }

    wideEvent.account_id = targetAccount.id

    return c.json({
      success: true,
      provider: targetAccount.providerId,
      accessToken: targetAccount.accessToken,
      expiresAt: targetAccount.accessTokenExpiresAt,
      userId: targetAccount.userId,
    })
  } catch (err: unknown) {
    wideEvent.status_code = 500
    wideEvent.outcome = "error"
    wideEvent.error = {
      name: err instanceof Error ? err.name : "UnknownError",
      message: err instanceof Error ? err.message : String(err),
    }
    return c.json({ error: "Internal Server Error" }, 500)
  } finally {
    wideEvent.duration_ms = Date.now() - startTime
    if (wideEvent.outcome === "error") {
      logger.error(wideEvent, "Fetch internal token failed")
    } else {
      logger.info(wideEvent, "Fetch internal token completed")
    }
  }
})

