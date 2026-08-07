import { logger } from "@workspace/logger"
import type { Context } from "hono"
import { Hono } from "hono"
import { recordClientEvent } from "./server/events"
import { acceptPublicInvoice, getPublicInvoice } from "./server/invoices"
import { sendOtp, verifyOtp } from "./server/otp"
import { acceptPublicProposal, getPublicProposal } from "./server/proposals"

export const app = new Hono<{
  Variables: {
    requestId: string
    logContext: Record<string, unknown>
  }
}>()

const port = Number(Bun.env.GATE_PORT ?? Bun.env.PORT ?? 4100)

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
  } catch (error: unknown) {
    const err = error as {
      status?: number
      message?: string
      stack?: string
      name?: string
    }
    wideEvent.statusCode = err.status || 500
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
    app: "apps/gate",
    port,
  })
})

// Public Proposal Endpoints
app.get("/api/public/proposal/:token", async (c) => {
  const token = c.req.param("token")
  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  const result = await getPublicProposal(token, { ipAddress, userAgent })

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
  const body = (await c.req.json().catch(() => ({}))) as {
    signerName?: string
    signerEmail?: string
    signatureText?: string
    signatureImage?: string
    otpVerified?: boolean
    agreedTerms?: boolean
  }

  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  if (!body.signerName || !body.signerEmail || body.agreedTerms !== true) {
    return c.json(
      {
        success: false,
        error: "signerName, signerEmail, and agreedTerms (true) are required",
      },
      400
    )
  }

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
    const err = error as { message?: string }
    return c.json(
      {
        success: false,
        error: err.message || "Failed to accept proposal",
      },
      400
    )
  }
})

// Public Invoice Endpoints
app.get("/api/public/invoice/:token", async (c) => {
  const token = c.req.param("token")
  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  const result = await getPublicInvoice(token, { ipAddress, userAgent })

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
  const body = (await c.req.json().catch(() => ({}))) as {
    signerName?: string
    signerEmail?: string
    signatureText?: string
    signatureImage?: string
    otpVerified?: boolean
    agreedTerms?: boolean
  }

  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  if (!body.signerName || !body.signerEmail || body.agreedTerms !== true) {
    return c.json(
      {
        success: false,
        error: "signerName, signerEmail, and agreedTerms (true) are required",
      },
      400
    )
  }

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
    const err = error as { message?: string }
    return c.json(
      {
        success: false,
        error: err.message || "Failed to accept invoice",
      },
      400
    )
  }
})

// OTP Endpoints
app.post("/api/public/otp/send", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    publicLinkId?: string
    email?: string
  }

  if (!body.publicLinkId || !body.email) {
    return c.json(
      { success: false, error: "publicLinkId and email are required" },
      400
    )
  }

  const result = await sendOtp(body.publicLinkId, body.email)
  return c.json(result, 200)
})

app.post("/api/public/otp/verify", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    publicLinkId?: string
    email?: string
    code?: string
  }

  if (!body.publicLinkId || !body.email || !body.code) {
    return c.json(
      {
        success: false,
        error: "publicLinkId, email, and code are required",
      },
      400
    )
  }

  const result = await verifyOtp(body.publicLinkId, body.email, body.code)
  if (!result.success) {
    return c.json(result, 400)
  }
  return c.json(result, 200)
})

// Event Recording Endpoints
const handleClientEvent = async (c: Context) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    documentType?: "proposal" | "invoice"
    token?: string
    eventType?: string
    metadata?: Record<string, unknown>
  }

  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  if (!body.documentType || !body.token || !body.eventType) {
    return c.json(
      {
        success: false,
        error: "documentType, token, and eventType are required",
      },
      400
    )
  }

  const result = await recordClientEvent({
    documentType: body.documentType,
    token: body.token,
    eventType: body.eventType,
    metadata: body.metadata,
    ipAddress,
    userAgent,
  })

  if (!result.success) {
    return c.json(result, 404)
  }
  return c.json(result, 200)
}

app.post("/api/public/event", handleClientEvent)
app.post("/api/public/events", handleClientEvent)

export default {
  port,
  fetch: app.fetch,
}
