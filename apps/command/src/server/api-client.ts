import { getBackendJwt } from "./auth"

const API_SERVER_URL = process.env.API_SERVER_URL ?? "http://localhost:8080"

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | Array<JsonValue>
  | { [key: string]: JsonValue }

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  status: number
}

interface ErrorResponse {
  message?: string
  error?: string
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

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const jwt = await getBackendJwt()

  if (!jwt.data) {
    return {
      error: jwt.error ?? "Unauthorized",
      status: jwt.status || 401,
    }
  }

  try {
    const headers = new Headers(options.headers)
    headers.set("Authorization", `Bearer ${jwt.data}`)

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }

    const response = await fetch(`${API_SERVER_URL}${endpoint}`, {
      ...options,
      headers,
    })
    const data = await readJson<ErrorResponse & T>(response)

    if (!response.ok) {
      return {
        error:
          data?.message ??
          data?.error ??
          `API Error: ${response.status} ${response.statusText}`,
        status: response.status,
      }
    }

    if (data === null) {
      return {
        status: response.status,
      }
    }

    return {
      data,
      status: response.status,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown API error",
      status: 0,
    }
  }
}
