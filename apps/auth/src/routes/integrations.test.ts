import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"
import { Hono } from "hono"
import { createIntegrationsRouter, integrationsRouter } from "./integrations"

describe("integrationsRouter /internal/token, /list and /disconnect", () => {
  const origBetterAuthSecret = process.env.BETTER_AUTH_SECRET
  const origAgentSecret = process.env.AGENT_AUTH_SECRET

  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = "test-secret-12345"
    delete process.env.AGENT_AUTH_SECRET
  })

  afterEach(() => {
    process.env.BETTER_AUTH_SECRET = origBetterAuthSecret
    process.env.AGENT_AUTH_SECRET = origAgentSecret
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
        headers: { "x-agent-secret": "wrong-secret" },
      }
    )
    expect(resInvalidHeader.status).toBe(403)
  })

  it("authorizes when either AGENT_AUTH_SECRET or BETTER_AUTH_SECRET matches", async () => {
    process.env.BETTER_AUTH_SECRET = "web-better-auth-secret"
    process.env.AGENT_AUTH_SECRET = "dedicated-agent-secret"

    const app = new Hono()
    app.route("/api/auth/integrations", integrationsRouter)

    // Using AGENT_AUTH_SECRET
    const resAgent = await app.request(
      "/api/auth/integrations/internal/token",
      {
        headers: { "x-agent-secret": "dedicated-agent-secret" },
      }
    )
    // Passes auth check and reaches validation (missing provider/userId -> 400, NOT 403)
    expect(resAgent.status).toBe(400)

    // Using BETTER_AUTH_SECRET in Bearer auth header
    const resWeb = await app.request(
      "/api/auth/integrations/internal/token",
      {
        headers: { authorization: "Bearer web-better-auth-secret" },
      }
    )
    expect(resWeb.status).toBe(400)
  })

  it("returns 503 when agent auth secrets are completely unset", async () => {
    delete process.env.BETTER_AUTH_SECRET
    delete process.env.AGENT_AUTH_SECRET

    const app = new Hono()
    app.route("/api/auth/integrations", integrationsRouter)

    const res = await app.request(
      "/api/auth/integrations/internal/token?provider=gmail&userId=user-1",
      {
        headers: { "x-agent-secret": "any-secret" },
      }
    )
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error).toContain("Service Unavailable")
  })

  it("returns 400 when provider query parameter is missing on authorized request", async () => {
    const app = new Hono()
    app.route("/api/auth/integrations", integrationsRouter)

    const res = await app.request(
      "/api/auth/integrations/internal/token?userId=user-1",
      {
        headers: { "x-agent-secret": "test-secret-12345" },
      }
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Missing provider parameter")
  })

  it("returns 400 when userId query parameter is missing on authorized request (prevents cross-tenant leaks)", async () => {
    const app = new Hono()
    app.route("/api/auth/integrations", integrationsRouter)

    const res = await app.request(
      "/api/auth/integrations/internal/token?provider=gmail",
      {
        headers: { "x-agent-secret": "test-secret-12345" },
      }
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Missing or invalid userId parameter")
  })

  it("returns 401 on /list when user session is missing", async () => {
    const app = new Hono()
    app.route("/api/auth/integrations", integrationsRouter)

    const res = await app.request("/api/auth/integrations/list")
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 401 on /disconnect when user session is missing", async () => {
    const app = new Hono()
    app.route("/api/auth/integrations", integrationsRouter)

    const res = await app.request("/api/auth/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: "acc-123" }),
    })
    expect(res.status).toBe(401)
  })

  it("returns 400 on /disconnect when accountId is missing or empty for authenticated user", async () => {
    const app = new Hono<{
      Variables: {
        user: { id: string; email: string } | null
        session: { id: string } | null
      }
    }>()
    app.use("*", async (c, next) => {
      c.set("user", { id: "u-1", email: "u@example.com" })
      c.set("session", { id: "s-1" })
      await next()
    })
    app.route("/api/auth/integrations", integrationsRouter)

    // Empty object
    const resEmpty = await app.request("/api/auth/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    expect(resEmpty.status).toBe(400)
    const jsonEmpty = await resEmpty.json()
    expect(jsonEmpty.code).toBe("INVALID_REQUEST")
    expect(jsonEmpty.error).toContain("accountId is required")

    // Empty string accountId
    const resWhitespace = await app.request("/api/auth/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: "   " }),
    })
    expect(resWhitespace.status).toBe(400)
  })

  it("returns 404 on /disconnect when accountId does not belong to authenticated user", async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    } as any

    const router = createIntegrationsRouter(mockDb)

    const app = new Hono<{
      Variables: {
        user: { id: string; email: string } | null
        session: { id: string } | null
      }
    }>()
    app.use("*", async (c, next) => {
      c.set("user", { id: "u-1", email: "u@example.com" })
      c.set("session", { id: "s-1" })
      await next()
    })
    app.route("/api/auth/integrations", router)

    const res = await app.request("/api/auth/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: "non-existent-or-other-user-acc" }),
    })

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe("ACCOUNT_NOT_FOUND")
    expect(json.error).toContain("not found or already disconnected")
  })

  it("delegates to auth.api.unlinkAccount passing targetAccount.providerId and internal targetAccount.id", async () => {
    const { auth } = await import("../lib/auth")

    const mockDbAccount = {
      id: "internal-record-id-789",
      providerId: "google-calendar",
      accountId: "external-oauth-sub-456",
      userId: "u-1",
    }

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockDbAccount]),
          }),
        }),
      }),
    } as any

    let capturedUnlinkBody: any = null
    const unlinkSpy = spyOn(auth.api as any, "unlinkAccount").mockImplementation(
      async (params: any) => {
        capturedUnlinkBody = params?.body
        return { status: true } as any
      }
    )

    const router = createIntegrationsRouter(mockDb)

    const app = new Hono<{
      Variables: {
        user: { id: string; email: string } | null
        session: { id: string } | null
      }
    }>()
    app.use("*", async (c, next) => {
      c.set("user", { id: "u-1", email: "u@example.com" })
      c.set("session", { id: "s-1" })
      await next()
    })
    app.route("/api/auth/integrations", router)

    const res = await app.request("/api/auth/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: "internal-record-id-789" }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    // Verify auth.api.unlinkAccount received providerId and internal record ID (targetAccount.id)
    expect(capturedUnlinkBody).not.toBeNull()
    expect(capturedUnlinkBody.providerId).toBe("google-calendar")
    expect(capturedUnlinkBody.accountId).toBe("internal-record-id-789")

    unlinkSpy.mockRestore()
  })
})




