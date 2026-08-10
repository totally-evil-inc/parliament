/**
 * Error formatting and sanitization utility for Parliament UI & Server Functions.
 * Strips raw SQL queries, internal database error structures, and stack traces,
 * converting them into clean, human-readable user messages for Sonner toasts and UI banners.
 */
export function getErrorMessage(error: unknown, fallbackMessage = "An unexpected error occurred"): string {
  if (!error) return fallbackMessage

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : fallbackMessage

  // Handle Unauthorized / Auth errors
  if (rawMessage.includes("Unauthorized") || rawMessage.includes("activeOrganizationId")) {
    return "Session expired or unauthorized. Please sign in again."
  }

  // Handle Raw SQL / Drizzle / Postgres Query Failures
  if (
    rawMessage.includes("Failed query:") ||
    rawMessage.includes("PostgresError:") ||
    rawMessage.includes("DrizzleQueryError") ||
    rawMessage.includes("column ") ||
    rawMessage.includes("relation ") ||
    rawMessage.includes("syntax error")
  ) {
    return "Database operation failed. Please refresh or try again later."
  }

  // Handle Zod Validation Errors
  if (rawMessage.includes("ZodError") || rawMessage.includes("invalid_type")) {
    return "Invalid input data. Please check your form values."
  }

  // Handle Network Connection Failures
  if (
    rawMessage.includes("Failed to fetch") ||
    rawMessage.includes("NetworkError") ||
    rawMessage.includes("ECONNREFUSED")
  ) {
    return "Network connection issue. Please check your internet connection."
  }

  // Return sanitized message if clean, otherwise fallback
  if (rawMessage.length > 0 && rawMessage.length < 150 && !rawMessage.includes("select ") && !rawMessage.includes("insert ")) {
    return rawMessage
  }

  return fallbackMessage
}
