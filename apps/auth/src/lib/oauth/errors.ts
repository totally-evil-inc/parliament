/**
 * Domain errors for OAuth integrations and token lifecycle management.
 * Designed defensively to ensure stable error codes and prevent leaking internal identifiers (such as user IDs).
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
    // Stable error message matching existing test expectations and avoiding internal ID leaks
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
 */
export class TokenRefreshError extends OAuthDomainError {
  readonly httpStatus?: number
  readonly providerErrorCode?: string

  constructor({
    provider,
    message,
    httpStatus,
    providerErrorCode,
  }: {
    provider: string
    message: string
    httpStatus?: number
    providerErrorCode?: string
  }) {
    super(message, "token_refresh_failed", provider)
    this.httpStatus = httpStatus
    this.providerErrorCode = providerErrorCode
  }
}
