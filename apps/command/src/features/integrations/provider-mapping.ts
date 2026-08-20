/**
 * Centralized provider capability, fallback mapping, and connection resolution
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
 * Defensively accounts for Google family fallback accounts (e.g., a primary 'google' account
 * fulfilling 'gmail' or 'google-calendar' capabilities).
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

    const normalizedAccountProvider = acc.providerId.trim().toLowerCase()

    // 1. Direct exact match
    if (normalizedAccountProvider === normalizedTarget) {
      return true
    }

    // 2. Google ecosystem fallback: If target is a Google service (gmail, calendar, drive)
    // and account is the parent 'google' provider, it is connected.
    if (
      normalizedAccountProvider === "google" &&
      (normalizedTarget === "gmail" ||
        normalizedTarget === "google-calendar" ||
        normalizedTarget === "google-drive")
    ) {
      return true
    }

    return false
  })
}

/**
 * Resolves the full list of provider IDs affected when disconnecting a provider.
 */
export function getRelatedDisconnectProviders(providerId: string): string[] {
  if (!providerId || typeof providerId !== "string") {
    return []
  }

  const normalized = providerId.trim().toLowerCase()
  if (GOOGLE_PROVIDER_FAMILY.includes(normalized as GoogleProviderId)) {
    return [...GOOGLE_PROVIDER_FAMILY]
  }

  return [normalized]
}
