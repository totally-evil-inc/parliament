import "@tanstack/react-start/server-only"

import { db, desc, eq, schema } from "@workspace/database"

import type {
  AuthTokenResult,
  CommandAuthContext,
  SessionJson,
} from "./auth-context"

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL ?? "http://localhost:4000"

const TOKEN_CACHE_SKEW_MS = 30_000

type BunRequestInit = RequestInit & { verbose?: boolean }

function getFetchErrorMessage(url: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown auth error"

  return `Failed to fetch ${url}: ${message}. Check that AUTH_SERVER_URL is correct and the auth server is running.`
}

function createFetchInit(init: RequestInit): BunRequestInit {
  return {
    ...init,
    verbose: process.env.NODE_ENV !== "production",
  }
}

interface TokenResponse {
  token?: string
  message?: string
  error?: string
}

interface CachedToken {
  token: string
  expiresAtMs: number
}

const tokenCache = new Map<string, CachedToken>()

function getForwardedHeaders(request: Request) {
  const headers = new Headers()

  for (const name of [
    "cookie",
    "user-agent",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
  ]) {
    const value = request.headers.get(name)

    if (value) {
      headers.set(name, value)
    }
  }

  return headers
}

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return null
  }

  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function getSessionCacheKey(headers: Headers) {
  const cookie = headers.get("cookie")

  if (!cookie) {
    return null
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(cookie)
  )

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

function decodeJwtExpiresAtMs(token: string) {
  const payload = token.split(".")[1]

  if (!payload) {
    return null
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    )
    const claims = JSON.parse(atob(paddedBase64)) as { exp?: unknown }

    if (typeof claims.exp !== "number") {
      return null
    }

    return claims.exp * 1000
  } catch {
    return null
  }
}

async function fetchSession(headers: Headers) {
  try {
    const url = `${AUTH_SERVER_URL}/api/auth/get-session`
    const response = await fetch(
      url,
      createFetchInit({
        method: "GET",
        headers,
      })
    )

    if (!response.ok) {
      return null
    }

    return await readJson<SessionJson>(response)
  } catch (error) {
    console.warn(
      getFetchErrorMessage(`${AUTH_SERVER_URL}/api/auth/get-session`, error)
    )
    return null
  }
}

function getActiveOrganizationId(session: SessionJson | null) {
  const activeOrganizationId = session?.session?.activeOrganizationId

  return typeof activeOrganizationId === "string" ? activeOrganizationId : null
}

function getSessionId(session: SessionJson | null) {
  const sessionId = session?.session?.id

  return typeof sessionId === "string" ? sessionId : null
}

function getUserId(session: SessionJson | null) {
  const userId = session?.user.id

  return typeof userId === "string" ? userId : null
}

async function selectActiveOrganizationFromMemberships(
  session: SessionJson | null
) {
  if (!session || getActiveOrganizationId(session)) {
    return session
  }

  const sessionId = getSessionId(session)
  const userId = getUserId(session)

  if (!sessionId || !userId) {
    return session
  }

  try {
    const memberships = await db
      .select({ organizationId: schema.member.organizationId })
      .from(schema.member)
      .where(eq(schema.member.userId, userId))
      .orderBy(desc(schema.member.createdAt))
      .limit(1)
    const membership = memberships.at(0)

    if (!membership) {
      return session
    }

    await db
      .update(schema.session)
      .set({ activeOrganizationId: membership.organizationId })
      .where(eq(schema.session.id, sessionId))

    return {
      ...session,
      session: {
        ...session.session,
        activeOrganizationId: membership.organizationId,
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown organization error"
    console.warn(`Failed to select active organization: ${message}`)
    return session
  }
}

function createBackendJwtResolver(
  headers: Headers,
  session: SessionJson | null
) {
  let inFlightToken: Promise<AuthTokenResult> | null = null

  return async () => {
    inFlightToken ??= fetchBackendJwt(headers, session)
    return await inFlightToken
  }
}

async function fetchBackendJwt(
  headers: Headers,
  session: SessionJson | null
): Promise<AuthTokenResult> {
  try {
    const sessionCookieKey = await getSessionCacheKey(headers)

    if (!sessionCookieKey) {
      return {
        error: "Unauthorized",
        status: 401,
      }
    }

    const cacheKey = [
      sessionCookieKey,
      getSessionId(session) ?? "no-session-id",
      getActiveOrganizationId(session) ?? "no-active-organization",
    ].join(":")

    const cachedToken = tokenCache.get(cacheKey)

    if (cachedToken && Date.now() < cachedToken.expiresAtMs) {
      return {
        data: cachedToken.token,
        status: 200,
      }
    }

    const url = `${AUTH_SERVER_URL}/api/auth/token`
    const response = await fetch(
      url,
      createFetchInit({
        method: "GET",
        headers,
      })
    )
    const data = await readJson<TokenResponse>(response)

    if (!response.ok || !data?.token) {
      return {
        error:
          data?.message ??
          data?.error ??
          `Auth Error: ${response.status} ${response.statusText}`,
        status: response.status,
      }
    }

    const expiresAtMs = decodeJwtExpiresAtMs(data.token)

    if (expiresAtMs) {
      tokenCache.set(cacheKey, {
        token: data.token,
        expiresAtMs: expiresAtMs - TOKEN_CACHE_SKEW_MS,
      })
    }

    return {
      data: data.token,
      status: response.status,
    }
  } catch (error) {
    return {
      error: getFetchErrorMessage(`${AUTH_SERVER_URL}/api/auth/token`, error),
      status: 0,
    }
  }
}

export async function createCommandAuthContext(
  request: Request
): Promise<CommandAuthContext> {
  const headers = getForwardedHeaders(request)
  const session = await selectActiveOrganizationFromMemberships(
    await fetchSession(headers)
  )

  return {
    user: session?.user ?? null,
    session,
    getBackendJwt: createBackendJwtResolver(headers, session),
  }
}
