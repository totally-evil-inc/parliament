import {
  acceptDocumentBodySchema,
  clientEventBodySchema,
} from "@workspace/document/public-api"
import type { Context } from "hono"
import { Hono } from "hono"

import { recordClientEvent } from "../lib/public-document/events"
import {
  acceptPublicInvoice,
  getPublicInvoice,
  getPublicInvoiceMeta,
} from "../lib/public-document/invoices"
import {
  acceptPublicProposal,
  getPublicProposal,
  getPublicProposalMeta,
} from "../lib/public-document/proposals"

export const publicDocumentRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: unknown
    logContext: Record<string, unknown>
  }
}>()

// Public Proposal Metadata Endpoint (unauthenticated)
publicDocumentRouter.get("/proposal/:token/meta", async (c) => {
  const token = c.req.param("token")
  const result = await getPublicProposalMeta(token)
  if (result.status === "not_found") return c.json(result, 404)
  if (result.status === "unavailable") return c.json(result, 400)
  return c.json(result, 200)
})

// Protected Public Proposal Endpoint (requires verified email session)
publicDocumentRouter.get("/proposal/:token", async (c) => {
  const token = c.req.param("token")
  const logContext = c.get("logContext")
  logContext.documentType = "proposal"
  logContext.tokenSuffix = token.slice(-6)
  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  const user = c.get("user")
  if (!user?.email) {
    return c.json(
      { status: "unauthorized", error: "Verification required" },
      401
    )
  }

  const result = await getPublicProposal(token, {
    sessionEmail: user.email,
    ipAddress,
    userAgent,
  })
  logContext.lookupStatus = result.status

  if (result.status === "not_found") {
    return c.json(result, 404)
  }
  if (result.status === "unavailable") {
    return c.json(result, 400)
  }
  if (result.status === "forbidden") {
    return c.json(result, 403)
  }
  return c.json(result, 200)
})

publicDocumentRouter.post("/proposal/:token/accept", async (c) => {
  const token = c.req.param("token")
  const user = c.get("user")
  if (!user?.email) {
    return c.json({ success: false, error: "Verification required" }, 401)
  }

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
      otpVerified: true,
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

// Public Invoice Metadata Endpoint (unauthenticated)
publicDocumentRouter.get("/invoice/:token/meta", async (c) => {
  const token = c.req.param("token")
  const result = await getPublicInvoiceMeta(token)
  if (result.status === "not_found") return c.json(result, 404)
  if (result.status === "unavailable") return c.json(result, 400)
  return c.json(result, 200)
})

// Protected Public Invoice Endpoint (requires verified email session)
publicDocumentRouter.get("/invoice/:token", async (c) => {
  const token = c.req.param("token")
  const logContext = c.get("logContext")
  logContext.documentType = "invoice"
  logContext.tokenSuffix = token.slice(-6)
  const ipAddress =
    c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || null
  const userAgent = c.req.header("user-agent") || null

  const user = c.get("user")
  if (!user?.email) {
    return c.json(
      { status: "unauthorized", error: "Verification required" },
      401
    )
  }

  const result = await getPublicInvoice(token, {
    sessionEmail: user.email,
    ipAddress,
    userAgent,
  })
  logContext.lookupStatus = result.status

  if (result.status === "not_found") {
    return c.json(result, 404)
  }
  if (result.status === "unavailable") {
    return c.json(result, 400)
  }
  if (result.status === "forbidden") {
    return c.json(result, 403)
  }
  return c.json(result, 200)
})

publicDocumentRouter.post("/invoice/:token/accept", async (c) => {
  const token = c.req.param("token")
  const user = c.get("user")
  if (!user?.email) {
    return c.json({ success: false, error: "Verification required" }, 401)
  }

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
      otpVerified: true,
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

publicDocumentRouter.post("/event", handleClientEvent)
publicDocumentRouter.post("/events", handleClientEvent)
