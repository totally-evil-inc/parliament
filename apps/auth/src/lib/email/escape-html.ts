/**
 * Escape HTML special characters for safe inclusion in HTML templates and attributes.
 * Handles &, <, >, ", ', and `/`.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Validates and sanitizes a URL for safe embedding in href attributes.
 * Only permits valid `http:`, `https:`, and relative paths (`/`, `#`).
 * Rejects dangerous protocols like `javascript:`, `data:`, and `vbscript:`.
 */
export function sanitizeEmailUrl(url: unknown, fallback = "#"): string {
  if (typeof url !== "string") return fallback
  const trimmed = url.trim()
  if (!trimmed) return fallback

  // Allow relative URLs
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return escapeHtml(trimmed)
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return escapeHtml(trimmed)
    }
  } catch {
    // Invalid URL format
  }

  return fallback
}
