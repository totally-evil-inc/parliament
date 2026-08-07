import { logger } from "@workspace/logger"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { poweredBy } from "hono/powered-by"

import { auth } from "./lib/auth"
import { trustedOrigins } from "./lib/utils"

export const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
    requestId: string
    logContext: Record<string, unknown>
  }
}>()
const port = Number(Bun.env.AUTH_PORT ?? Bun.env.PORT ?? 4000)

app.use(poweredBy())

app.use("*", async (c, next) => {
  const startTime = Date.now()
  const requestId = c.req.header("x-request-id") || crypto.randomUUID()
  c.set("requestId", requestId)

  const logContext: Record<string, unknown> = {}
  c.set("logContext", logContext)

  const url = new URL(c.req.url)
  const wideEvent: Record<string, unknown> = {
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
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown error"
    const stack = error instanceof Error ? error.stack : undefined
    const name = error instanceof Error ? error.name : "UnknownError"
    const maybeStatus = (error as { status?: unknown })?.status
    const statusCode =
      typeof maybeStatus === "number" && maybeStatus >= 400 && maybeStatus < 600
        ? maybeStatus
        : 500

    wideEvent.statusCode = statusCode
    wideEvent.outcome = "error"
    wideEvent.error = {
      message,
      stack,
      name,
    }
    throw error
  } finally {
    wideEvent.durationMs = Date.now() - startTime

    // Merge any custom log context set during request lifecycle
    Object.assign(wideEvent, c.get("logContext"))

    if (
      wideEvent.outcome === "error" ||
      (typeof wideEvent.statusCode === "number" && wideEvent.statusCode >= 500)
    ) {
      logger.error(wideEvent)
    } else {
      logger.info(wideEvent)
    }
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

import { addonRouter } from "./routes/addon"
import { agentAuthRouter } from "./routes/agent-auth"
import { gmailRouter } from "./routes/gmail"
import { inboundRouter } from "./routes/inbound"
import { integrationsRouter } from "./routes/integrations"
import { inviteRouter } from "./routes/invite"
import { magicLinkRouter } from "./routes/magic-link"

app.route("/auth/magic-link", magicLinkRouter)
app.route("/auth/invite", inviteRouter)
app.route("/api/auth/integrations", integrationsRouter)
app.route("/api/auth/agent", agentAuthRouter)
app.route("/api/gmail/addon", addonRouter)
app.route("/api/gmail", gmailRouter)
app.route("/api/inbound", inboundRouter)

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})

export default {
  port,
  fetch: app.fetch,
}
