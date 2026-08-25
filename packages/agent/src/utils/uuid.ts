/**
 * Canonical UUID regular expression matching standard 8-4-4-4-12 hex UUID formats,
 * fully supporting RFC 4122 (versions 1-5) and RFC 9562 (versions 6-8, including UUIDv7).
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Lenient UUID regex for checking generic 8-4-4-4-12 hex representation.
 */
export const LENIENT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Defensive type-guard checking if a value is a valid string representation of a UUID.
 * Safely handles null, undefined, objects, numbers, and non-string inputs.
 */
export function isUuid(val: unknown): val is string {
  if (typeof val !== "string") return false
  const trimmed = val.trim()
  if (trimmed.length !== 36) return false
  return UUID_REGEX.test(trimmed) || LENIENT_UUID_REGEX.test(trimmed)
}

/**
 * Asserts that a value is a valid UUID string, throwing a descriptive TypeError otherwise.
 */
export function assertUuid(val: unknown, paramName = "id"): string {
  if (!isUuid(val)) {
    throw new TypeError(
      `Invalid UUID provided for '${paramName}': expected 36-character hexadecimal UUID, got '${String(val)}'`
    )
  }
  return val.trim()
}
