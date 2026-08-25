import {
  IntegrationNotConnectedError,
  OAuthConfigMissingError,
  TokenRefreshError,
} from "../oauth/errors"
import { googleTokenService } from "../oauth/google-token-service"

export {
  IntegrationNotConnectedError,
  OAuthConfigMissingError,
  TokenRefreshError,
}

/**
 * Retrieves a valid Google Access Token for the specified userId.
 * Resolves dedicated 'gmail' or fallback 'google' account, automatically
 * refreshing token via Google OAuth endpoint if near expiry with concurrency deduplication.
 */
export async function getValidGoogleAccessToken(
  userId: string
): Promise<string> {
  return googleTokenService.getValidAccessToken(userId, "gmail")
}
