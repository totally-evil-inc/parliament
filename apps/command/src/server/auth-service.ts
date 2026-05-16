import "@tanstack/react-start/server-only"

import type {
  AuthTokenResult,
  CommandAuthContext,
  SessionJson,
} from "./auth-context"

const AUTH_SERVER_URL =
  process.env.AUTH_SERVER_URL ??
  "http://localhost:4000"

const TOKEN_CACHE_SKEW_MS = 30_000

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
    const response = await fetch(`${AUTH_SERVER_URL}/api/auth/get-session`, {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      return null
    }

    return await readJson<SessionJson>(response)
  } catch {
    return null
  }
}

function createBackendJwtResolver(headers: Headers) {
  let inFlightToken: Promise<AuthTokenResult> | null = null

  return async () => {
    inFlightToken ??= fetchBackendJwt(headers)
    return await inFlightToken
  }
}

async function fetchBackendJwt(headers: Headers): Promise<AuthTokenResult> {
  try {
    const cacheKey = await getSessionCacheKey(headers)

    if (!cacheKey) {
      return {
        error: "Unauthorized",
        status: 401,
      }
    }

    const cachedToken = tokenCache.get(cacheKey)

    if (cachedToken && Date.now() < cachedToken.expiresAtMs) {
      return {
        data: cachedToken.token,
        status: 200,
      }
    }

    const response = await fetch(`${AUTH_SERVER_URL}/api/auth/token`, {
      method: "GET",
      headers,
    })
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
      error: error instanceof Error ? error.message : "Unknown auth error",
      status: 0,
    }
  }
}

export async function createCommandAuthContext(
  request: Request
): Promise<CommandAuthContext> {
  const headers = getForwardedHeaders(request)
  const session = await fetchSession(headers)

  return {
    user: session?.user ?? null,
    session,
    getBackendJwt: createBackendJwtResolver(headers),
  }
}
