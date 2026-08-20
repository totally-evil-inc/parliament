/**
 * Centralized provider definitions and connection resolution
 * for OAuth integrations across the command application.
 */

export const GOOGLE_PROVIDER_FAMILY = [
  "google",
  "gmail",
  "google-calendar",
  "google-drive",
] as const

export type GoogleProviderId = (typeof GOOGLE_PROVIDER_FAMILY)[number]

export const SUPPORTED_INTEGRATIONS = [
  ...GOOGLE_PROVIDER_FAMILY,
  "cal",
] as const

/**
 * Checks if a specific integration provider is connected given the user's connected OAuth accounts.
 * Service capabilities (gmail, google-calendar, google-drive) require their dedicated linked
 * provider with service-specific granted scopes.
 * Safely tolerates undefined/null items, trimming, and casing.
 */
export function isIntegrationConnected(
  accounts: ReadonlyArray<{ providerId: string }> | null | undefined,
  targetProviderId: string
): boolean {
  if (
    !Array.isArray(accounts) ||
    !targetProviderId ||
    typeof targetProviderId !== "string"
  ) {
    return false
  }

  const normalizedTarget = targetProviderId.trim().toLowerCase()

  return accounts.some((acc) => {
    if (!acc || typeof acc.providerId !== "string") {
      return false
    }

    const accountProvider = acc.providerId.trim().toLowerCase()
    return accountProvider === normalizedTarget
  })
}
