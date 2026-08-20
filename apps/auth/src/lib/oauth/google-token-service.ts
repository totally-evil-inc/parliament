import { and, db, desc, eq, inArray, sql } from "@workspace/database"
import { account } from "@workspace/database/schema"
import { logger } from "@workspace/logger"
import {
  IntegrationNotConnectedError,
  OAuthConfigMissingError,
  TokenRefreshError,
} from "./errors"

export type SupportedGoogleProvider =
  | "google"
  | "gmail"
  | "google-calendar"
  | "google-drive"

interface GoogleTokenRefreshResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

export type TokenDetails = {
  accessToken: string
  expiresAt: Date | null
  providerId: string
  accountId: string
  userId: string
}

type RefreshedTokenResult = {
  accessToken: string
  expiresAt: Date
}

/**
 * Shared service for resolving and refreshing Google OAuth tokens defensively.
 * Handles fallback accounts, in-flight concurrency deduplication, wide event logging,
 * and sanitized domain errors.
 */
export class GoogleTokenService {
  /**
   * In-flight refresh promise deduplication map keyed by account.id.
   * NOTE: This provides process-local deduplication to protect against bursty concurrent
   * requests on a single worker instance. For horizontally scaled multi-instance deployments,
   * database-level row locking or optimistic updates can be layered on top if needed.
   */
  private inFlightRefreshes = new Map<string, Promise<RefreshedTokenResult>>()
  private dbClient: typeof db

  constructor(customDb: typeof db = db) {
    this.dbClient = customDb
  }

  /**
   * Resolves a valid Google access token for the given user and provider.
   * Uses single-query provider preference and deduplicated token refresh if expired.
   */
  async getValidAccessToken(
    userId: string,
    targetProvider: SupportedGoogleProvider = "google"
  ): Promise<string> {
    const details = await this.getValidTokenDetails(userId, targetProvider)
    return details.accessToken
  }

  /**
   * Resolves a valid Google access token with full account and expiry details.
   */
  async getValidTokenDetails(
    userId: string,
    targetProvider: SupportedGoogleProvider = "google"
  ): Promise<TokenDetails> {
    const startTime = Date.now()
    const wideEvent: Record<string, unknown> = {
      action: "google_oauth_token_resolve",
      requestedProvider: targetProvider,
      userId,
      tokenRefreshed: false,
      timestamp: new Date().toISOString(),
    }

    try {
      if (!userId || typeof userId !== "string") {
        throw new IntegrationNotConnectedError(targetProvider)
      }

      // 1. Single database query with deterministic SQL CASE provider preference:
      // Exact provider match (0) is prioritized before fallback 'google' account (1),
      // with latest updatedAt breaking ties deterministically.
      const targetProviders =
        targetProvider === "google"
          ? ["google"]
          : [targetProvider, "google"]

      const records = await this.dbClient
        .select()
        .from(account)
        .where(
          and(
            eq(account.userId, userId),
            inArray(account.providerId, targetProviders)
          )
        )
        .orderBy(
          sql`CASE WHEN ${account.providerId} = ${targetProvider} THEN 0 ELSE 1 END`,
          desc(account.updatedAt)
        )
        .limit(1)

      if (!records || records.length === 0) {
        throw new IntegrationNotConnectedError(targetProvider)
      }

      const targetAccount = records[0]
      wideEvent.resolvedProvider = targetAccount.providerId
      wideEvent.accountId = targetAccount.id

      const now = Date.now()
      const expiresAtMs = targetAccount.accessTokenExpiresAt?.getTime() ?? 0
      const isExpired =
        !targetAccount.accessTokenExpiresAt || expiresAtMs <= now + 60_000

      // If token is valid and present, return immediately
      if (!isExpired && targetAccount.accessToken) {
        wideEvent.outcome = "success"
        return {
          accessToken: targetAccount.accessToken,
          expiresAt: targetAccount.accessTokenExpiresAt,
          providerId: targetAccount.providerId,
          accountId: targetAccount.id,
          userId: targetAccount.userId,
        }
      }

      // If expired or missing accessToken but refreshToken is present, refresh token
      if (targetAccount.refreshToken) {
        wideEvent.tokenRefreshed = true
        const refreshed = await this.deduplicatedRefresh(
          targetAccount,
          targetProvider
        )
        wideEvent.outcome = "success"
        return {
          accessToken: refreshed.accessToken,
          expiresAt: refreshed.expiresAt,
          providerId: targetAccount.providerId,
          accountId: targetAccount.id,
          userId: targetAccount.userId,
        }
      }

      // Missing both valid token and refresh token
      if (!targetAccount.accessToken) {
        throw new IntegrationNotConnectedError(targetProvider)
      }

      wideEvent.outcome = "success"
      return {
        accessToken: targetAccount.accessToken,
        expiresAt: targetAccount.accessTokenExpiresAt,
        providerId: targetAccount.providerId,
        accountId: targetAccount.id,
        userId: targetAccount.userId,
      }
    } catch (error: unknown) {
      wideEvent.outcome = "error"
      if (error instanceof Error) {
        wideEvent.error = {
          name: error.name,
          message: error.message,
          code:
            error instanceof IntegrationNotConnectedError ||
            error instanceof TokenRefreshError ||
            error instanceof OAuthConfigMissingError
              ? error.code
              : "unknown_error",
        }
      } else {
        wideEvent.error = { message: "Non-error exception thrown" }
      }
      throw error
    } finally {
      wideEvent.duration_ms = Date.now() - startTime
      if (wideEvent.outcome === "error") {
        logger.error(wideEvent, "Google OAuth token resolution failed")
      } else {
        logger.info(wideEvent, "Google OAuth token resolution completed")
      }
    }
  }

  /**
   * Concurrently deduplicates token refresh requests for the same account ID in-process.
   */
  private async deduplicatedRefresh(
    targetAccount: typeof account.$inferSelect,
    targetProvider: string
  ): Promise<RefreshedTokenResult> {
    const existing = this.inFlightRefreshes.get(targetAccount.id)
    if (existing) {
      return existing
    }

    const refreshPromise = this.executeTokenRefresh(
      targetAccount,
      targetProvider
    ).finally(() => {
      this.inFlightRefreshes.delete(targetAccount.id)
    })

    this.inFlightRefreshes.set(targetAccount.id, refreshPromise)
    return refreshPromise
  }

  /**
   * Executes the HTTP refresh request against Google OAuth token endpoint
   * and persists new credentials safely in database.
   */
  private async executeTokenRefresh(
    targetAccount: typeof account.$inferSelect,
    targetProvider: string
  ): Promise<RefreshedTokenResult> {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new OAuthConfigMissingError(targetProvider)
    }

    if (!targetAccount.refreshToken) {
      throw new IntegrationNotConnectedError(targetProvider)
    }

    let refreshRes: Response
    try {
      refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: targetAccount.refreshToken,
        }),
      })
    } catch (networkErr: unknown) {
      const message =
        networkErr instanceof Error
          ? networkErr.message
          : "Network request failed"
      throw new TokenRefreshError({
        provider: targetProvider,
        message: "Failed to refresh Google access token: network connection error",
        providerDescription: message,
      })
    }

    if (!refreshRes.ok) {
      const errorBody = (await refreshRes.json().catch(() => null)) as
        | GoogleTokenRefreshResponse
        | null
      const providerErrorCode = errorBody?.error || "http_error"
      const providerDescription = errorBody?.error_description

      // Stable public message, details stored in structured properties for logging
      throw new TokenRefreshError({
        provider: targetProvider,
        message: "Failed to refresh Google access token",
        httpStatus: refreshRes.status,
        providerErrorCode,
        providerDescription,
      })
    }

    const tokenData = (await refreshRes.json().catch(() => null)) as
      | GoogleTokenRefreshResponse
      | null

    if (!tokenData?.access_token) {
      throw new TokenRefreshError({
        provider: targetProvider,
        message: "Failed to refresh Google access token: invalid response format",
      })
    }

    const newExpiresAt = new Date(
      Date.now() + (tokenData.expires_in || 3600) * 1000
    )
    const persistedRefreshToken =
      tokenData.refresh_token ?? targetAccount.refreshToken

    await this.dbClient
      .update(account)
      .set({
        accessToken: tokenData.access_token,
        accessTokenExpiresAt: newExpiresAt,
        refreshToken: persistedRefreshToken,
        updatedAt: new Date(),
      })
      .where(eq(account.id, targetAccount.id))

    return {
      accessToken: tokenData.access_token,
      expiresAt: newExpiresAt,
    }
  }
}

export const googleTokenService = new GoogleTokenService()
