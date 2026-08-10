export interface RetryPolicyOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
}

export function shouldRetry(
  error: unknown,
  attemptCount: number,
  maxAttempts = 3
): boolean {
  if (attemptCount >= maxAttempts) return false

  if (error && typeof error === "object") {
    const err = error as {
      status?: number
      code?: string
      name?: string
      message?: string
    }

    // Do NOT retry non-retriable auth or validation errors
    if (
      err.status === 401 ||
      err.status === 403 ||
      err.status === 404 ||
      err.status === 422
    ) {
      return false
    }

    if (err.name === "ZodError" || err.code === "INVALID_INPUT") {
      return false
    }
  }

  return true
}

export function calculateBackoffDelayMs(
  attemptCount: number,
  options: RetryPolicyOptions = {}
): number {
  const {
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffFactor = 2,
  } = options
  const calculated =
    initialDelayMs * backoffFactor ** Math.max(0, attemptCount - 1)
  return Math.min(calculated, maxDelayMs)
}

export function createCollectionRetryConfig(options: RetryPolicyOptions = {}) {
  const maxAttempts = options.maxAttempts ?? 3

  return {
    retry: (failureCount: number, error: unknown) =>
      shouldRetry(error, failureCount, maxAttempts),
    retryDelay: (attemptIndex: number) =>
      calculateBackoffDelayMs(attemptIndex + 1, options),
  }
}
