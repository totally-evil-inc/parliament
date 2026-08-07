import { and, db, desc, eq } from "@workspace/database"
import { account } from "@workspace/database/schema"
import { logger } from "@workspace/logger"
import { Hono } from "hono"

export const integrationsRouter = new Hono<{
  Variables: {
    user: any
    session: any
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
 * Internal endpoint for Go Harness to retrieve a valid OAuth access token for an integration provider.
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
  const isProduction = process.env.NODE_ENV === "production"

  if (expectedSecret) {
    if (secretHeader !== expectedSecret) {
      if (!isProduction && !secretHeader) {
        logger.warn(
          { path: c.req.path },
          "Allowing unauthenticated local loopback token request in non-production mode"
        )
      } else {
        logger.error(
          { secretHeaderProvided: !!secretHeader, path: c.req.path },
          "Forbidden: Invalid or missing harness authorization secret"
        )
        return c.json(
          { error: "Forbidden: Invalid harness authorization secret" },
          403
        )
      }
    }
  } else {
    if (isProduction) {
      logger.error(
        { path: c.req.path },
        "Harness secret not configured in production"
      )
      return c.json({ error: "Internal Server Error" }, 500)
    } else {
      logger.warn(
        { path: c.req.path },
        "Harness secret not configured, allowing request in non-production mode"
      )
    }
  }

  const provider = c.req.query("provider")
  const userId = c.req.query("userId")

  if (!provider) {
    return c.json({ error: "Bad Request: Missing provider parameter" }, 400)
  }

  try {
    const whereConditions = [eq(account.providerId, provider)]
    if (userId) {
      whereConditions.push(eq(account.userId, userId))
    }

    let records = await db
      .select()
      .from(account)
      .where(and(...whereConditions))
      .orderBy(desc(account.updatedAt))
      .limit(1)

    // Fallback check for legacy 'google' provider account if specific app account isn't found
    if (
      records.length === 0 &&
      (provider === "gmail" ||
        provider === "google-calendar" ||
        provider === "google-drive")
    ) {
      const fallbackConditions = [eq(account.providerId, "google")]
      if (userId) {
        fallbackConditions.push(eq(account.userId, userId))
      }
      records = await db
        .select()
        .from(account)
        .where(and(...fallbackConditions))
        .orderBy(desc(account.updatedAt))
        .limit(1)
    }

    if (records.length === 0) {
      return c.json(
        { error: `No account connected for provider: ${provider}` },
        404
      )
    }

    const targetAccount = records[0]

    // Check token expiration and perform refresh if necessary
    const now = new Date()
    const isExpired =
      !targetAccount.accessTokenExpiresAt ||
      targetAccount.accessTokenExpiresAt.getTime() <= now.getTime() + 60000

    const isGoogleProvider = [
      "google",
      "gmail",
      "google-calendar",
      "google-drive",
    ].includes(targetAccount.providerId)

    if (isExpired && targetAccount.refreshToken && isGoogleProvider) {
      logger.info(
        { provider, accountId: targetAccount.id },
        "Google access token expired/nearing expiry. Refreshing..."
      )
      try {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            grant_type: "refresh_token",
            refresh_token: targetAccount.refreshToken,
          }),
        })

        if (refreshRes.ok) {
          const tokenData: any = await refreshRes.json()
          if (tokenData.access_token) {
            const newExpiresAt = new Date(
              Date.now() + (tokenData.expires_in || 3600) * 1000
            )
            await db
              .update(account)
              .set({
                accessToken: tokenData.access_token,
                accessTokenExpiresAt: newExpiresAt,
                refreshToken: tokenData.refresh_token ?? targetAccount.refreshToken,
                updatedAt: new Date(),
              })
              .where(eq(account.id, targetAccount.id))

            targetAccount.accessToken = tokenData.access_token
            targetAccount.accessTokenExpiresAt = newExpiresAt
            logger.info(
              { provider, accountId: targetAccount.id },
              "Successfully refreshed Google access token"
            )
          }
        } else {
          const errText = await refreshRes.text()
          logger.error(
            { status: refreshRes.status, errText },
            "Google token refresh failed"
          )
        }
      } catch (refreshErr) {
        logger.error(
          { refreshErr, accountId: targetAccount.id },
          "Exception during Google token refresh"
        )
      }
    }

    return c.json({
      success: true,
      provider: targetAccount.providerId,
      accessToken: targetAccount.accessToken,
      expiresAt: targetAccount.accessTokenExpiresAt,
      userId: targetAccount.userId,
    })
  } catch (err: any) {
    logger.error({ err, provider }, "Error fetching internal integration token")
    return c.json({ error: "Internal Server Error" }, 500)
  }
})
