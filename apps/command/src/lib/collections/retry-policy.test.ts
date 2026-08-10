import { describe, expect, it } from "bun:test"
import {
  calculateBackoffDelayMs,
  createCollectionRetryConfig,
  shouldRetry,
} from "./retry-policy"

describe("Collection Retry Policy", () => {
  it("allows retrying transient network errors up to maxAttempts", () => {
    const error = new Error("Network timeout")
    expect(shouldRetry(error, 1, 3)).toBe(true)
    expect(shouldRetry(error, 2, 3)).toBe(true)
    expect(shouldRetry(error, 3, 3)).toBe(false)
  })

  it("rejects retries for 401, 403, and 404 status errors", () => {
    expect(shouldRetry({ status: 401 }, 1)).toBe(false)
    expect(shouldRetry({ status: 403 }, 1)).toBe(false)
    expect(shouldRetry({ status: 404 }, 1)).toBe(false)
    expect(shouldRetry({ status: 422 }, 1)).toBe(false)
  })

  it("rejects retries for Zod input validation errors", () => {
    expect(shouldRetry({ name: "ZodError" }, 1)).toBe(false)
    expect(shouldRetry({ code: "INVALID_INPUT" }, 1)).toBe(false)
  })

  it("calculates 3-tier exponential backoff delay correctly", () => {
    expect(calculateBackoffDelayMs(1)).toBe(1000)
    expect(calculateBackoffDelayMs(2)).toBe(2000)
    expect(calculateBackoffDelayMs(3)).toBe(4000)
    expect(calculateBackoffDelayMs(4)).toBe(8000)
    expect(calculateBackoffDelayMs(5)).toBe(10000) // capped at maxDelayMs
  })

  it("creates TanStack Query retry config object", () => {
    const config = createCollectionRetryConfig({ maxAttempts: 3 })
    expect(config.retry(1, new Error("Transient"))).toBe(true)
    expect(config.retry(3, new Error("Transient"))).toBe(false)
    expect(config.retryDelay(0)).toBe(1000)
    expect(config.retryDelay(1)).toBe(2000)
  })
})
