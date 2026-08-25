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
 * Retrieves a valid Google Calendar Access Token for the specified userId.
 * Resolves dedicated 'google-calendar' or fallback 'google' account, automatically
 * refreshing token via Google OAuth endpoint if near expiry with concurrency deduplication.
 */
export async function getValidCalendarAccessToken(
  userId: string
): Promise<string> {
  return googleTokenService.getValidAccessToken(userId, "google-calendar")
}
