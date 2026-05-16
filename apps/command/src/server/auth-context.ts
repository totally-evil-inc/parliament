type JsonValue =
  | string
  | number
  | boolean
  | null
  | Array<JsonValue>
  | { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }

export type SessionJson = JsonObject & {
  session?: JsonObject & {
    id?: string
    activeOrganizationId?: string | null
  }
  user: JsonObject
}

export interface AuthTokenResult {
  data?: string
  error?: string
  status: number
}

export interface CommandAuthContext {
  user: JsonObject | null
  session: SessionJson | null
  getBackendJwt: () => Promise<AuthTokenResult>
}

export interface AuthenticatedCommandAuthContext extends CommandAuthContext {
  user: JsonObject
  session: SessionJson
}
