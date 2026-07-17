import { createMiddleware, createStart } from "@tanstack/react-start"
import { logger } from "@workspace/logger"

import { createCommandAuthContext } from "./server/auth-service"

const authMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const auth = await createCommandAuthContext(request)

    return next({
      context: {
        auth,
      },
    })
  }
)

const loggingMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next, context }) => {
    const startTime = Date.now()
    const url = new URL(request.url)
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID()

    const wideEvent: Record<string, any> = {
      requestId,
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      userAgent: request.headers.get("user-agent"),
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        commitHash: process.env.COMMIT_HASH || "unknown",
        version: "0.0.1",
      },
    }

    try {
      const result = await next()

      const auth = (context as any).auth
      if (auth) {
        if (auth.user) {
          wideEvent.user = { id: auth.user.id, email: auth.user.email }
        }
        if (auth.session) {
          wideEvent.session = {
            id: auth.session.session?.id || auth.session.id,
            activeOrganizationId:
              auth.session.session?.activeOrganizationId ||
              auth.session.activeOrganizationId,
          }
        }
      }

      wideEvent.statusCode = 200
      wideEvent.outcome = "success"
      return result
    } catch (error: any) {
      wideEvent.statusCode = error.status || 500
      wideEvent.outcome = "error"
      wideEvent.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
      throw error
    } finally {
      wideEvent.durationMs = Date.now() - startTime
      logger.info(wideEvent)
    }
  }
)

export const startInstance = createStart(() => ({
  requestMiddleware: [authMiddleware, loggingMiddleware],
}))
