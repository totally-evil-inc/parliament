import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { Hono } from "hono"
import { integrationsRouter } from "./integrations"

describe("integrationsRouter /internal/token and /disconnect", () => {
  const origBetterAuthSecret = process.env.BETTER_AUTH_SECRET
  const origHarnessSecret = process.env.HARNESS_AUTH_SECRET

  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = "test-secret-12345"
    delete process.env.HARNESS_AUTH_SECRET
  })

  afterEach(() => {
    process.env.BETTER_AUTH_SECRET = origBetterAuthSecret
    process.env.HARNESS_AUTH_SECRET = origHarnessSecret
  })

  it("returns 403 when authorization secret header is missing or incorrect", async () => {
    const app = new Hono()
    app.route("/api/auth/integrations", integrationsRouter)

    // Missing header
    const resNoHeader = await app.request(
      "/api/auth/integrations/internal/token?provider=gmail&userId=user-1"
    )
    expect(resNoHeader.status).toBe(403)
    const jsonNoHeader = await resNoHeader.json()
    expect(jsonNoHeader.error).toContain("Forbidden")

    // Invalid header
    const resInvalidHeader = await app.request(
      "/api/auth/integrations/internal/token?provider=gmail&userId=user-1",
      {
        headers: { "x-harness-secret": "wrong-secret" },
      }
    )
    expect(resInvalidHeader.status).toBe(403)
  })

  it("returns 400 when provider query parameter is missing on authorized request", async () => {
    const app = new Hono()
    app.route("/api/auth/integrations", integrationsRouter)

    const res = await app.request(
      "/api/auth/integrations/internal/token?userId=user-1",
      {
        headers: { "x-harness-secret": "test-secret-12345" },
      }
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Missing provider parameter")
  })

  it("returns 401 on /disconnect when user session is missing", async () => {
    const app = new Hono()
    app.route("/api/auth/integrations", integrationsRouter)

    const res = await app.request("/api/auth/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: "gmail" }),
    })
    expect(res.status).toBe(401)
  })
})
