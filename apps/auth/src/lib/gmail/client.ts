import { and, db, desc, eq } from "@workspace/database"
import { account } from "@workspace/database/schema"
import { logger } from "@workspace/logger"

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  error?: string
  error_description?: string
}

/**
 * Retrieves a valid Google Access Token for the specified userId.
 * Automatically refreshes token via Google OAuth token endpoint if near expiry.
 */
export async function getValidGoogleAccessToken(
  userId: string
): Promise<string> {
  const records = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .orderBy(desc(account.updatedAt))
    .limit(1)

  if (records.length === 0) {
    throw new Error(`No connected Google account found for user: ${userId}`)
  }

  const targetAccount = records[0]

  const now = new Date()
  const isExpired =
    !targetAccount.accessTokenExpiresAt ||
    targetAccount.accessTokenExpiresAt.getTime() <= now.getTime() + 60000

  if (isExpired && targetAccount.refreshToken) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      throw new Error(
        "Missing required GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variable"
      )
    }

    logger.info(
      { userId, accountId: targetAccount.id },
      "Refreshing Google access token for user"
    )

    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: targetAccount.refreshToken,
      }),
    })

    if (!refreshRes.ok) {
      const errText = await refreshRes.text()
      logger.error(
        { status: refreshRes.status, errText, userId },
        "Failed to refresh Google token"
      )
      throw new Error(
        `Failed to refresh Google token: ${refreshRes.statusText}`
      )
    }

    const tokenData = (await refreshRes
      .json()
      .catch(() => null)) as GoogleTokenResponse | null
    if (!tokenData || !tokenData.access_token) {
      throw new Error("Invalid token refresh response from Google")
    }

    const newExpiresAt = new Date(
      Date.now() + (tokenData.expires_in || 3600) * 1000
    )
    const persistedRefreshToken =
      tokenData.refresh_token ?? targetAccount.refreshToken

    await db
      .update(account)
      .set({
        accessToken: tokenData.access_token,
        accessTokenExpiresAt: newExpiresAt,
        refreshToken: persistedRefreshToken,
        updatedAt: new Date(),
      })
      .where(eq(account.id, targetAccount.id))

    return tokenData.access_token
  }

  if (!targetAccount.accessToken) {
    throw new Error(`Access token missing for user: ${userId}`)
  }

  return targetAccount.accessToken
}
