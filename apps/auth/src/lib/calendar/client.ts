import { and, db, desc, eq, inArray } from "@workspace/database"
import { account } from "@workspace/database/schema"
import { logger } from "@workspace/logger"

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  error?: string
  error_description?: string
}

export async function getValidCalendarAccessToken(
  userId: string
): Promise<string> {
  const records = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        inArray(account.providerId, ["google-calendar", "google"])
      )
    )
    .orderBy(desc(account.updatedAt))
    .limit(1)

  if (records.length === 0) {
    throw new Error("integration_not_connected")
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
        "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured"
      )
    }

    logger.info(
      { userId, accountId: targetAccount.id },
      "Refreshing Google Calendar access token"
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

    const tokenData = (await refreshRes
      .json()
      .catch(() => null)) as GoogleTokenResponse | null
    if (!tokenData?.access_token) {
      throw new Error("Failed to refresh Google Calendar token")
    }

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

    return tokenData.access_token
  }

  if (!targetAccount.accessToken) {
    throw new Error("integration_not_connected")
  }

  return targetAccount.accessToken
}
