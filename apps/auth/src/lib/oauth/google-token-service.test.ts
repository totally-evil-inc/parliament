import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import type { db } from "@workspace/database"
import {
  IntegrationNotConnectedError,
  OAuthConfigMissingError,
  TokenRefreshError,
} from "./errors"
import { GoogleTokenService } from "./google-token-service"

describe("GoogleTokenService", () => {
  const origClientId = process.env.GOOGLE_CLIENT_ID
  const origClientSecret = process.env.GOOGLE_CLIENT_SECRET
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "mock-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret"
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = origClientId
    process.env.GOOGLE_CLIENT_SECRET = origClientSecret
    globalThis.fetch = originalFetch
  })

  it("returns unexpired access token directly without refresh", async () => {
    const validExpiry = new Date(Date.now() + 3600 * 1000)
    const mockAccount = {
      id: "acc-1",
      userId: "user-123",
      providerId: "gmail",
      accessToken: "ya29.valid-token",
      refreshToken: "rt.123",
      accessTokenExpiresAt: validExpiry,
    }

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([mockAccount]),
            }),
          }),
        }),
      }),
    } as unknown as typeof db

    const service = new GoogleTokenService(mockDb)
    const token = await service.getValidAccessToken("user-123", "gmail")
    expect(token).toBe("ya29.valid-token")
  })

  it("resolves parent google account as fallback for google-calendar", async () => {
    const validExpiry = new Date(Date.now() + 3600 * 1000)
    const mockGoogleAccount = {
      id: "acc-google",
      userId: "user-456",
      providerId: "google",
      accessToken: "ya29.google-parent-token",
      refreshToken: "rt.google",
      accessTokenExpiresAt: validExpiry,
    }

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([mockGoogleAccount]),
            }),
          }),
        }),
      }),
    } as unknown as typeof db

    const service = new GoogleTokenService(mockDb)
    const details = await service.getValidTokenDetails(
      "user-456",
      "google-calendar"
    )
    expect(details.accessToken).toBe("ya29.google-parent-token")
    expect(details.providerId).toBe("google")
    expect(details.expiresAt).toEqual(validExpiry)
  })

  it("throws IntegrationNotConnectedError when no account matches", async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    } as unknown as typeof db

    const service = new GoogleTokenService(mockDb)

    await expect(
      service.getValidAccessToken("non-existent-user", "gmail")
    ).rejects.toThrow(IntegrationNotConnectedError)

    try {
      await service.getValidAccessToken("user-secret-id", "gmail")
    } catch (err: any) {
      expect(err.code).toBe("integration_not_connected")
      expect(err.message).toBe("integration_not_connected")
      // Crucial: ensures internal user ID is not leaked in message
      expect(err.message).not.toContain("user-secret-id")
    }
  })

  it("refreshes expired token, updates database, and returns updated expiresAt in TokenDetails", async () => {
    const expiredDate = new Date(Date.now() - 60 * 1000)
    const mockAccount = {
      id: "acc-refresh-1",
      userId: "user-refresh",
      providerId: "gmail",
      accessToken: "ya29.expired-token",
      refreshToken: "rt.valid-refresh",
      accessTokenExpiresAt: expiredDate,
    }

    let updateCalled = false
    let persistedExpiry: Date | null = null
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([mockAccount]),
            }),
          }),
        }),
      }),
      update: () => ({
        set: (data: any) => {
          expect(data.accessToken).toBe("ya29.refreshed-token")
          persistedExpiry = data.accessTokenExpiresAt
          return {
            where: () => {
              updateCalled = true
              return Promise.resolve()
            },
          }
        },
      }),
    } as unknown as typeof db

    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: "ya29.refreshed-token",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    ) as unknown as typeof fetch

    const service = new GoogleTokenService(mockDb)
    const details = await service.getValidTokenDetails(
      "user-refresh",
      "gmail"
    )
    expect(details.accessToken).toBe("ya29.refreshed-token")
    expect(updateCalled).toBe(true)
    // Critical verification: ensure returned expiresAt matches refreshed expiry, NOT stale expired date
    expect(details.expiresAt).not.toEqual(expiredDate)
    expect(details.expiresAt?.getTime()).toBeGreaterThan(Date.now() + 3000 * 1000)
    expect(details.expiresAt).toEqual(persistedExpiry!)
  })

  it("handles upstream HTTP refresh errors defensively without leaking provider descriptions in message", async () => {
    const expiredDate = new Date(Date.now() - 60 * 1000)
    const mockAccount = {
      id: "acc-err-1",
      userId: "user-err",
      providerId: "google-calendar",
      accessToken: "ya29.expired",
      refreshToken: "rt.revoked",
      accessTokenExpiresAt: expiredDate,
    }

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([mockAccount]),
            }),
          }),
        }),
      }),
    } as unknown as typeof db

    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Token has been expired or revoked.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      )
    ) as unknown as typeof fetch

    const service = new GoogleTokenService(mockDb)

    await expect(
      service.getValidAccessToken("user-err", "google-calendar")
    ).rejects.toThrow(TokenRefreshError)

    try {
      await service.getValidAccessToken("user-err", "google-calendar")
    } catch (err: any) {
      expect(err).toBeInstanceOf(TokenRefreshError)
      expect(err.httpStatus).toBe(400)
      expect(err.providerErrorCode).toBe("invalid_grant")
      expect(err.providerDescription).toBe("Token has been expired or revoked.")
      expect(err.code).toBe("token_refresh_failed")
      // Stable error message without raw description leak
      expect(err.message).toBe("Failed to refresh Google access token")
      expect(err.message).not.toContain("user-err")
      expect(err.message).not.toContain("Token has been expired or revoked")
    }
  })

  it("deduplicates concurrent refresh requests for the same account", async () => {
    const expiredDate = new Date(Date.now() - 60 * 1000)
    const mockAccount = {
      id: "acc-concurrent",
      userId: "user-concurrent",
      providerId: "gmail",
      accessToken: "ya29.expired",
      refreshToken: "rt.concurrent",
      accessTokenExpiresAt: expiredDate,
    }

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([mockAccount]),
            }),
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
    } as unknown as typeof db

    let fetchCallCount = 0
    globalThis.fetch = mock(async () => {
      fetchCallCount++
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 20))
      return new Response(
        JSON.stringify({
          access_token: "ya29.shared-refreshed-token",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }) as unknown as typeof fetch

    const service = new GoogleTokenService(mockDb)

    // Execute two concurrent requests simultaneously for the same user/account
    const [details1, details2] = await Promise.all([
      service.getValidTokenDetails("user-concurrent", "gmail"),
      service.getValidTokenDetails("user-concurrent", "gmail"),
    ])

    expect(details1.accessToken).toBe("ya29.shared-refreshed-token")
    expect(details2.accessToken).toBe("ya29.shared-refreshed-token")
    expect(details1.expiresAt).toEqual(details2.expiresAt)
    // Concurrency deduplication ensures fetch was only called ONCE
    expect(fetchCallCount).toBe(1)
  })

  it("throws OAuthConfigMissingError when client ID or secret is unset", async () => {
    delete process.env.GOOGLE_CLIENT_ID
    const expiredDate = new Date(Date.now() - 60 * 1000)
    const mockAccount = {
      id: "acc-no-cfg",
      userId: "user-no-cfg",
      providerId: "gmail",
      accessToken: "ya29.expired",
      refreshToken: "rt.refresh",
      accessTokenExpiresAt: expiredDate,
    }

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([mockAccount]),
            }),
          }),
        }),
      }),
    } as unknown as typeof db

    const service = new GoogleTokenService(mockDb)

    await expect(
      service.getValidAccessToken("user-no-cfg", "gmail")
    ).rejects.toThrow(OAuthConfigMissingError)
  })
})
