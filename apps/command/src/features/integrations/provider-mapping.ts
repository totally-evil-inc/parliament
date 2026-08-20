/**
 * Centralized provider capability and fallback mapping
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
 * Maps parent 'google' OAuth account to child capabilities ('gmail', 'google-calendar', 'google-drive').
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
    if (accountProvider === normalizedTarget) {
      return true
    }

    // Google ecosystem fallback: primary 'google' account fulfills gmail, calendar, and drive
    if (
      accountProvider === "google" &&
      (normalizedTarget === "gmail" ||
        normalizedTarget === "google-calendar" ||
        normalizedTarget === "google-drive")
    ) {
      return true
    }

    return false
  })
}
