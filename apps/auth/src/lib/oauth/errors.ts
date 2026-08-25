/**
 * Domain errors for OAuth integrations and token lifecycle management.
 * Designed defensively to ensure stable error codes and prevent leaking internal identifiers (such as user IDs)
 * or raw third-party provider messages to callers.
 */

export class OAuthDomainError extends Error {
  readonly code: string
  readonly provider: string
  readonly isOperational: boolean

  constructor(message: string, code: string, provider: string) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.provider = provider
    this.isOperational = true
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Thrown when no active or valid OAuth connection exists for the requested provider.
 */
export class IntegrationNotConnectedError extends OAuthDomainError {
  constructor(provider: string) {
    super("integration_not_connected", "integration_not_connected", provider)
  }
}

/**
 * Thrown when provider OAuth configuration (e.g. client ID/secret) is missing or invalid.
 */
export class OAuthConfigMissingError extends OAuthDomainError {
  constructor(provider: string) {
    super(
      `OAuth client credentials not configured for provider: ${provider}`,
      "oauth_config_missing",
      provider
    )
  }
}

/**
 * Thrown when an upstream OAuth token refresh request fails or returns an invalid payload.
 * Stores raw provider status and codes for internal structured logging while keeping
 * the public .message string stable and safe.
 */
export class TokenRefreshError extends OAuthDomainError {
  readonly httpStatus?: number
  readonly providerErrorCode?: string
  readonly providerDescription?: string

  constructor({
    provider,
    message = "Failed to refresh Google access token",
    httpStatus,
    providerErrorCode,
    providerDescription,
  }: {
    provider: string
    message?: string
    httpStatus?: number
    providerErrorCode?: string
    providerDescription?: string
  }) {
    super(message, "token_refresh_failed", provider)
    this.httpStatus = httpStatus
    this.providerErrorCode = providerErrorCode
    this.providerDescription = providerDescription
  }
}
