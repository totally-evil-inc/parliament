import { logger } from "@workspace/logger"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { poweredBy } from "hono/powered-by"

import { auth } from "./lib/auth"
import { trustedOrigins } from "./lib/utils"

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
  }
}>()
const port = Number(Bun.env.AUTH_PORT ?? Bun.env.PORT ?? 4000)

app.use(poweredBy())

app.use("*", async (c, next) => {
  const startTime = Date.now()
  const requestId = c.req.header("x-request-id") || crypto.randomUUID()

  const url = new URL(c.req.url)
  const wideEvent: Record<string, any> = {
    requestId,
    method: c.req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    userAgent: c.req.header("user-agent"),
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      commitHash: process.env.COMMIT_HASH || "unknown",
      version: "0.0.1",
    },
  }

  try {
    await next()

    wideEvent.statusCode = c.res.status
    wideEvent.outcome = c.res.status >= 400 ? "failure" : "success"

    const user = c.get("user")
    const session = c.get("session")
    if (user) {
      wideEvent.user = { id: user.id, email: user.email }
    }
    if (session) {
      wideEvent.session = {
        id: session.id,
        activeOrganizationId: session.activeOrganizationId,
      }
    }
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
})

app.use(
  "*",
  cors({
    origin: trustedOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["*"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
)

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    c.set("user", null)
    c.set("session", null)
    return next()
  }

  c.set("user", session.user)
  c.set("session", session.session)
  return next()
})

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})

export default {
  port,
  fetch: app.fetch,
}
