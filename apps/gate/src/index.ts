import { logger } from "@workspace/logger"
import type { Context } from "hono"
import { Hono } from "hono"
import { z } from "zod"
import { recordClientEvent } from "./server/events"
import { acceptPublicInvoice, getPublicInvoice } from "./server/invoices"
import { sendOtp, verifyOtp } from "./server/otp"
import { acceptPublicProposal, getPublicProposal } from "./server/proposals"

const acceptDocumentBodySchema = z.object({
  signerName: z.string().min(1),
  signerEmail: z.string().min(1),
  signatureText: z.string().optional(),
  signatureImage: z.string().optional(),
  otpVerified: z.boolean().optional(),
  agreedTerms: z.literal(true),
})

const otpSendBodySchema = z.object({
  publicLinkId: z.string().min(1),
  email: z.string().min(1),
})

const otpVerifyBodySchema = z.object({
  publicLinkId: z.string().min(1),
  email: z.string().min(1),
  code: z.string().min(1),
})

const clientEventBodySchema = z.object({
  documentType: z.enum(["proposal", "invoice"]),
  token: z.string().min(1),
  eventType: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const app = new Hono<{
  Variables: {
    requestId: string
    requestStartTime: number
    errorLogged: boolean
    logContext: Record<string, unknown>
  }
}>()

const port = Number(Bun.env.GATE_PORT ?? Bun.env.PORT ?? 4100)

app.use("*", async (c, next) => {
  const startTime = Date.now()
  const requestId = c.req.header("x-request-id") || crypto.randomUUID()
  c.set("requestId", requestId)
  c.header("x-request-id", requestId)
  c.set("requestStartTime", startTime)

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
  } catch (error: unknown) {
    const err = error as {
      status?: number
      message?: string
      stack?: string
      name?: string
    }
    wideEvent.statusCode =
      typeof err.status === "number" && err.status >= 400 && err.status < 600
        ? err.status
        : 500
    wideEvent.outcome = "error"
    wideEvent.error = {
      message: err.message || "Unknown error",
      stack: err.stack,
      name: err.name,
    }
    throw error
  } finally {
    wideEvent.durationMs = Date.now() - startTime

    Object.assign(wideEvent, c.get("logContext"))

    // Errors handled by app.onError are logged there with full detail; skip
    // the middleware log for those requests to avoid duplication.
    if (c.get("errorLogged") !== true) {
      if (
        wideEvent.outcome === "error" ||
        (typeof wideEvent.statusCode === "number" &&
          wideEvent.statusCode >= 500)
      ) {
        logger.error(wideEvent)
      } else {
        logger.info(wideEvent)
      }
    }
  }
})

app.onError((error: unknown, c) => {
  const err = error as {
    status?: number
    message?: string
    stack?: string
    name?: string
  }
  const status =
    typeof err.status === "number" && err.status >= 400 && err.status < 600
      ? err.status
      : 500

  const wideEvent: Record<string, unknown> = {
    requestId: c.get("requestId"),
    statusCode: status,
    outcome: "error",
    error: {
      message: err.message || "Unknown error",
      stack: err.stack,
      name: err.name,
    },
    timestamp: new Date().toISOString(),
  }

  Object.assign(wideEvent, c.get("logContext"))
  if (typeof c.get("requestStartTime") === "number") {
    wideEvent.durationMs = Date.now() - c.get("requestStartTime")
  }

  // Sanitize what the caller sees: internal details never leak, they stay
  // in the structured wide-event log above.
  c.set("errorLogged", true)
  const responseStatus = status as 400 | 404 | 409 | 500
  logger.error(wideEvent)
  return c.json(
    {
      success: false,
      error:
        status >= 500
          ? "Internal Server Error"
          : err.message || "Unknown error",
    },
    responseStatus
  )
})

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    app: "apps/gate",
    port,
  })
})

// Public Proposal Endpoints
app.get("/api/public/proposal/:token", async (c) => {
  const token = c.req.param("token")
  const logContext = c.get("logContext")
  logContext.documentType = "proposal"
  logContext.tokenSuffix = token.slice(-6)
  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  const result = await getPublicProposal(token, { ipAddress, userAgent })
  logContext.lookupStatus = result.status

  if (result.status === "not_found") {
    return c.json(result, 404)
  }
  if (result.status === "unavailable") {
    return c.json(result, 400)
  }
  return c.json(result, 200)
})

app.post("/api/public/proposal/:token/accept", async (c) => {
  const token = c.req.param("token")
  const parsed = acceptDocumentBodySchema.safeParse(
    await c.req.json().catch(() => ({}))
  )

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "signerName, signerEmail, and agreedTerms (true) are required",
      },
      400
    )
  }
  const body = parsed.data

  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  try {
    const accepted = await acceptPublicProposal({
      token,
      signerName: body.signerName,
      signerEmail: body.signerEmail,
      signatureText: body.signatureText,
      signatureImage: body.signatureImage,
      otpVerified: body.otpVerified,
      agreedTerms: body.agreedTerms,
      ipAddress,
      userAgent,
    })

    return c.json({ success: true, accepted }, 200)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to accept proposal"
    return c.json(
      {
        success: false,
        error: message,
      },
      400
    )
  }
})

// Public Invoice Endpoints
app.get("/api/public/invoice/:token", async (c) => {
  const token = c.req.param("token")
  const logContext = c.get("logContext")
  logContext.documentType = "invoice"
  logContext.tokenSuffix = token.slice(-6)
  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  const result = await getPublicInvoice(token, { ipAddress, userAgent })
  logContext.lookupStatus = result.status

  if (result.status === "not_found") {
    return c.json(result, 404)
  }
  if (result.status === "unavailable") {
    return c.json(result, 400)
  }
  return c.json(result, 200)
})

app.post("/api/public/invoice/:token/accept", async (c) => {
  const token = c.req.param("token")
  const parsed = acceptDocumentBodySchema.safeParse(
    await c.req.json().catch(() => ({}))
  )

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "signerName, signerEmail, and agreedTerms (true) are required",
      },
      400
    )
  }
  const body = parsed.data

  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  try {
    const accepted = await acceptPublicInvoice({
      token,
      signerName: body.signerName,
      signerEmail: body.signerEmail,
      signatureText: body.signatureText,
      signatureImage: body.signatureImage,
      otpVerified: body.otpVerified,
      agreedTerms: body.agreedTerms,
      ipAddress,
      userAgent,
    })

    return c.json({ success: true, accepted }, 200)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to accept invoice"
    return c.json(
      {
        success: false,
        error: message,
      },
      400
    )
  }
})

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// OTP Endpoints
app.post("/api/public/otp/send", async (c) => {
  const parsed = otpSendBodySchema.safeParse(
    await c.req.json().catch(() => ({}))
  )
  if (!parsed.success || !EMAIL_REGEX.test(parsed.data.email.trim())) {
    return c.json(
      { success: false, error: "Valid publicLinkId and email are required" },
      400
    )
  }
  const body = parsed.data

  try {
    const result = await sendOtp(body.publicLinkId, body.email.trim())
    return c.json(result, 200)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to send OTP"
    return c.json({ success: false, error: message }, 500)
  }
})

app.post("/api/public/otp/verify", async (c) => {
  const parsed = otpVerifyBodySchema.safeParse(
    await c.req.json().catch(() => ({}))
  )
  if (!parsed.success || !EMAIL_REGEX.test(parsed.data.email.trim())) {
    return c.json(
      {
        success: false,
        error: "Valid publicLinkId, email, and code are required",
      },
      400
    )
  }
  const body = parsed.data

  try {
    const result = await verifyOtp(
      body.publicLinkId,
      body.email.trim(),
      body.code.trim()
    )
    if (!result.success) {
      return c.json(result, 400)
    }
    return c.json(result, 200)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify OTP"
    return c.json({ success: false, error: message }, 500)
  }
})

// Event Recording Endpoints
const handleClientEvent = async (c: Context) => {
  const parsed = clientEventBodySchema.safeParse(
    await c.req.json().catch(() => ({}))
  )
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "documentType, token, and eventType are required",
      },
      400
    )
  }
  const body = parsed.data

  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  const result = await recordClientEvent({
    documentType: body.documentType,
    token: body.token,
    eventType: body.eventType,
    metadata: body.metadata,
    ipAddress,
    userAgent,
  })

  if (!result.success) {
    return c.json(result, result.reason === "not_found" ? 404 : 400)
  }
  return c.json(result, 200)
}

app.post("/api/public/event", handleClientEvent)
app.post("/api/public/events", handleClientEvent)

if (import.meta.main) {
  Bun.serve({
    port,
    fetch: app.fetch,
  })
}
