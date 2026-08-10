import { createHash, timingSafeEqual } from "node:crypto"

const DEFAULT_TRUSTED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4000",
  "http://localhost:4100",
]

export const trustedOrigins =
  Bun.env.AUTH_TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? DEFAULT_TRUSTED_ORIGINS

/**
 * Constant-time string comparison. Secrets are hashed first so inputs of
 * different lengths can be compared without leaking length information.
 */
export function secretsEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest()
  const hashB = createHash("sha256").update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

/**
 * Accepts either a bare shared secret or a `Bearer <secret>`-prefixed header.
 */
export function bearerSecretMatch(
  header: string | null | undefined,
  secret: string
): boolean {
  if (!header || !secret) return false
  if (secretsEqual(header, secret)) return true
  if (header.startsWith("Bearer ") && secretsEqual(header.slice(7), secret)) {
    return true
  }
  return false
}
