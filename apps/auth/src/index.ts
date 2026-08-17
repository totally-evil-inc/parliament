import { logger } from "@workspace/logger"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { poweredBy } from "hono/powered-by"

import { auth } from "./lib/auth"
import { isAllowedOrigin } from "./lib/utils"

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
  c.header("x-request-id", requestId)

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

    if (c.res.status >= 400) {
      const responseBody = await c.res
        .clone()
        .json()
        .catch(() => null)
      if (responseBody && typeof responseBody === "object") {
        const body = responseBody as Record<string, unknown>
        const nestedError =
          body.error && typeof body.error === "object"
            ? (body.error as Record<string, unknown>)
            : null
        wideEvent.error = {
          code: body.code ?? nestedError?.code,
          message: body.message ?? nestedError?.message,
          status: body.status ?? nestedError?.status,
        }
      }
    }

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

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    app: "apps/auth",
    port,
  })
})

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*"
      return isAllowedOrigin(origin) ? origin : origin
    },
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-request-id",
      "x-test-session-email",
      "x-test-org-id",
      "x-test-user-id",
      "Last-Event-ID",
      "Cache-Control",
      "Pragma",
      "Accept",
      "X-Run-Id",
      "*",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposeHeaders: [
      "Content-Length",
      "x-request-id",
      "Last-Event-ID",
      "X-Run-Id",
    ],
    maxAge: 600,
    credentials: true,
  })
)

app.use("*", async (c, next) => {
  if (process.env.NODE_ENV === "test") {
    const testEmail = c.req.header("x-test-session-email")
    if (testEmail) {
      const testOrgId = c.req.header("x-test-org-id") || null
      const testUserId =
        c.req.header("x-test-user-id") || "00000000-0000-7000-8000-000000000001"
      c.set("user", {
        id: testUserId,
        email: testEmail,
        name: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
      })
      c.set("session", {
        id: "test-session-id",
        userId: testUserId,
        expiresAt: new Date(Date.now() + 3600000),
        token: "test-token",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
        activeOrganizationId: testOrgId,
      })
      return next()
    }
  }

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

import { processDueScheduledDispatches } from "./lib/scheduler/dispatch-worker"
import { addonRouter } from "./routes/addon"
import { agentChatRouter } from "./routes/agent/chat"
import { agentHistoryRouter } from "./routes/agent/history"
import { agentSettingsRouter } from "./routes/agent/settings"
import { agentToolsRouter } from "./routes/agent/tools"
import { agentAuthRouter } from "./routes/agent-auth"
import { gmailRouter } from "./routes/gmail"
import { inboundRouter } from "./routes/inbound"
import { integrationsRouter } from "./routes/integrations"
import { inviteRouter } from "./routes/invite"
import { magicLinkRouter } from "./routes/magic-link"
import { publicDocumentRouter } from "./routes/public-document"
import { schedulerRouter } from "./routes/scheduler"

app.route("/auth/magic-link", magicLinkRouter)
app.route("/auth/invite", inviteRouter)
app.route("/api/auth/integrations", integrationsRouter)
app.route("/api/auth/agent", agentAuthRouter)
app.route("/api/agent", agentHistoryRouter)
app.route("/api/agent", agentChatRouter)
app.route("/api/agent", agentSettingsRouter)
app.route("/api/agent/tools", agentToolsRouter)
app.route("/api/gmail/addon", addonRouter)
app.route("/api/gmail", gmailRouter)
app.route("/api/inbound", inboundRouter)
app.route("/api/public", publicDocumentRouter)
app.route("/api/scheduler", schedulerRouter)

// Background worker: Poll and process scheduled document emails every 30 seconds
if (process.env.NODE_ENV !== "test") {
  const SCHEDULER_INTERVAL_MS = 30000
  setInterval(() => {
    processDueScheduledDispatches().catch((err) => {
      logger.error({ err }, "Background scheduled dispatches tick failed")
    })
  }, SCHEDULER_INTERVAL_MS)
}

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})

export default {
  port,
  fetch: app.fetch,
  // Agent responses are long-lived SSE streams. Bun's default 10-second idle
  // timeout terminates requests while the provider is thinking or between
  // streamed chunks, producing an apparent "no response" in the client.
  // Bun caps idleTimeout at 255 seconds. Long provider turns must keep the
  // connection active by emitting SSE heartbeats rather than exceeding it.
  idleTimeout: 255,
}
