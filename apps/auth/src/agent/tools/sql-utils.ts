/**
 * Escapes special SQL LIKE wildcard characters (`%`, `_`, `\`) so that
 * user input is matched literally against column values rather than acting as wildcards.
 */
export function escapeLikePattern(str: unknown): string {
  if (typeof str !== "string") return ""
  return str.replace(/[%_\\]/g, "\\$&")
}
