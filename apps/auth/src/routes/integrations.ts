import { and, db, desc, eq } from "@workspace/database"
import { account } from "@workspace/database/schema"
import { logger } from "@workspace/logger"
import { Hono } from "hono"
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
  }
}>()

/**
 * List connected integration accounts for the authenticated user
 */
integrationsRouter.get("/list", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
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

    return c.json({ accounts: userAccounts })
  } catch (err: any) {
    logger.error(
      { err, userId: user.id },
      "Failed to fetch user integration accounts"
    )
    return c.json({ error: "Failed to fetch integration accounts" }, 500)
  }
})

/**
 * Disconnect/Unlink integration account for the authenticated user via Better Auth API.
 */
integrationsRouter.post("/disconnect", async (c) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const body = await c.req.json().catch(() => ({}))
    const providerId = body.providerId
    const accountId = body.accountId

    if (
      (!providerId || typeof providerId !== "string") &&
      (!accountId || typeof accountId !== "string")
    ) {
      return c.json(
        { error: "Bad Request: providerId or accountId is required" },
        400
      )
    }

    try {
      const result = await auth.api.unlinkAccount({
        headers: c.req.raw.headers,
        body: {
          providerId,
          accountId,
        },
      })

      logger.info(
        {
          userId: user.id,
          providerId: providerId ?? null,
          accountId: accountId ?? null,
        },
        "User disconnected integration account via Better Auth API"
      )

      return c.json({ success: true, result })
    } catch (unlinkErr: any) {
      logger.warn(
        { err: unlinkErr, userId: user.id, providerId, accountId },
        "Better Auth unlink account failed"
      )
      return c.json(
        {
          error: unlinkErr?.message || "Failed to disconnect integration account",
          code: unlinkErr?.code || "UNLINK_FAILED",
        },
        unlinkErr?.status || 400
      )
    }
  } catch (err: any) {
    logger.error(
      { err, userId: user.id },
      "Failed to process disconnect request"
    )
    return c.json({ error: "Failed to disconnect integration account" }, 500)
  }
})

/**
 * Internal endpoint for the Parliament Agent runtime to retrieve a valid OAuth access token for an integration provider.
 * Secured via X-Harness-Secret header or BETTER_AUTH_SECRET matching.
 */
integrationsRouter.get("/internal/token", async (c) => {
  const rawAuthHeader = c.req.header("authorization") || ""
  const secretHeader =
    c.req.header("x-harness-secret") ||
    (rawAuthHeader.toLowerCase().startsWith("bearer ")
      ? rawAuthHeader.slice(7)
      : rawAuthHeader)

  const expectedSecret =
    process.env.BETTER_AUTH_SECRET || process.env.HARNESS_AUTH_SECRET

  if (expectedSecret) {
    if (!bearerSecretMatch(secretHeader, expectedSecret)) {
      logger.error(
        { secretHeaderProvided: !!secretHeader, path: c.req.path },
        "Forbidden: Invalid or missing harness authorization secret"
      )
      return c.json(
        { error: "Forbidden: Invalid harness authorization secret" },
        403
      )
    }
  } else {
    if (process.env.NODE_ENV === "production") {
      logger.error(
        { path: c.req.path },
        "Harness secret not configured in production"
      )
    }
    return c.json(
      { error: "Service Unavailable: Harness auth secret is not configured" },
      503
    )
  }

  const provider = c.req.query("provider")
  const userId = c.req.query("userId")

  if (!provider) {
    return c.json({ error: "Bad Request: Missing provider parameter" }, 400)
  }
  if (userId !== undefined && typeof userId !== "string") {
    return c.json({ error: "Bad Request: userId must be a string" }, 400)
  }

  try {
    const isGoogleProvider = [
      "google",
      "gmail",
      "google-calendar",
      "google-drive",
    ].includes(provider)

    if (isGoogleProvider && userId) {
      try {
        const details = await googleTokenService.getValidTokenDetails(
          userId,
          provider as SupportedGoogleProvider
        )

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

    // Generic / non-Google provider lookup (provider-specific without fallback)
    const whereConditions = [eq(account.providerId, provider)]
    if (userId) {
      whereConditions.push(eq(account.userId, userId))
    }

    const records = await db
      .select()
      .from(account)
      .where(and(...whereConditions))
      .orderBy(desc(account.updatedAt))

    if (!records || records.length === 0) {
      return c.json(
        { error: `No account connected for provider: ${provider}` },
        404
      )
    }

    const targetAccount =
      records.find((rec) => rec.providerId === provider) ?? records[0]

    return c.json({
      success: true,
      provider: targetAccount.providerId,
      accessToken: targetAccount.accessToken,
      expiresAt: targetAccount.accessTokenExpiresAt,
      userId: targetAccount.userId,
    })
  } catch (err: unknown) {
    logger.error(
      {
        err: err instanceof Error ? err.message : String(err),
        provider,
      },
      "Error fetching internal integration token"
    )
    return c.json({ error: "Internal Server Error" }, 500)
  }
})
