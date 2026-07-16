import { Hono } from "hono"
import { auth } from "../lib/auth"

export const magicLinkRouter = new Hono<{
  Variables: {
    logContext: Record<string, any>
  }
}>()

// Magic Link Request
magicLinkRouter.post("/request", async (c) => {
  try {
    const body = await c.req.json()
    const { email } = body
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return c.json({ error: "Invalid email" }, 400)
    }

    const logContext = c.get("logContext")
    if (logContext) {
      logContext.requested_email = email.trim().toLowerCase()
    }

    const url = new URL(c.req.url)
    url.pathname = "/api/auth/magic-link"
    const rewrittenReq = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: JSON.stringify(body),
    })
    return auth.handler(rewrittenReq)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

// Magic Link Verification
magicLinkRouter.get("/verify", async (c) => {
  const { token } = c.req.query()
  const logContext = c.get("logContext")
  if (logContext) {
    logContext.token_provided = !!token
  }

  const url = new URL(c.req.url)
  url.pathname = "/api/auth/magic-link/verify"
  const rewrittenReq = new Request(url.toString(), {
    method: c.req.method,
    headers: c.req.raw.headers,
  })
  return auth.handler(rewrittenReq)
})
