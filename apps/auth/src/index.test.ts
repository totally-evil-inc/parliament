import { mock, describe, test, expect, beforeAll } from "bun:test"

// Mock database module
mock.module("@workspace/database", () => {
  const queryBuilder = {
    from: () => queryBuilder,
    where: () => queryBuilder,
    limit: () => queryBuilder,
    orderBy: () => queryBuilder,
    then: (onfulfilled: any) => {
      onfulfilled([
        {
          id: "mock-id",
          identifier: "test@example.com",
          value: "7106037b51b32d205c086438aa2948bbca17316715f3ec56a5c2d3a339931818", // sha256 of "raw-token"
          expiresAt: new Date(Date.now() + 100000),
          email: "invited@example.com",
          organizationId: "org-id",
          role: "member",
          status: "pending",
          userId: "inviter-id",
          name: "Test Org",
        }
      ])
    }
  }

  const mockDb = {
    insert: () => ({
      values: () => ({
        returning: () => [{ id: "mock-id", email: "invited@example.com", organizationId: "org-id", role: "member", status: "pending" }]
      })
    }),
    select: () => queryBuilder,
    delete: () => ({
      where: () => ({})
    }),
    update: () => ({
      set: () => ({
        where: () => ({})
      })
    })
  }

  return {
    db: mockDb,
    schema: {
      user: { id: "user" },
      session: { id: "session" },
      verification: { id: "verification", identifier: "identifier", value: "value", expiresAt: "expiresAt" },
      invitation: { id: "invitation", organizationId: "organizationId", email: "email", role: "role", status: "status", expiresAt: "expiresAt" },
      member: { id: "member" },
      organization: { id: "organization", name: "orgname" }
    },
    eq: () => ({}),
    and: () => ({})
  }
})

// Mock Better Auth lib
mock.module("./lib/auth", () => {
  return {
    auth: {
      handler: async (req: Request) => {
        const url = new URL(req.url)
        if (url.pathname === "/api/auth/magic-link") {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        }
        if (url.pathname === "/api/auth/magic-link/verify") {
          const callbackURL = url.searchParams.get("callbackURL") || "http://localhost:3000/"
          return new Response(null, {
            status: 302,
            headers: {
              "Location": callbackURL,
              "Set-Cookie": "better-auth.session_token=mock-token; Path=/"
            }
          })
        }
        if (url.pathname === "/api/auth/organization/invite-member") {
          const cookie = req.headers.get("cookie")
          if (!cookie?.includes("valid-session")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            })
          }
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        }
        return new Response("Not Found", { status: 404 })
      },
      api: {
        getSession: async ({ headers }: { headers: Headers }) => {
          if (headers.get("cookie")?.includes("valid-session")) {
            return {
              user: { id: "inviter-id", email: "inviter@example.com", name: "Inviter" },
              session: { id: "session-id", userId: "inviter-id" }
            }
          }
          return null
        },
        createSession: async () => {
          return new Response(JSON.stringify({ token: "mock-token" }), {
            status: 200,
            headers: {
              "Set-Cookie": "better-auth.session_token=mock-token; Path=/"
            }
          })
        }
      }
    }
  }
})

// Mock global fetch for email render and Resend
beforeAll(() => {
  ;(global as any).fetch = async (url: string | URL, _init?: RequestInit) => {
    if (url.toString().includes("/internal/email/render")) {
      return new Response(JSON.stringify({ html: "<h1>Rendered HTML</h1>" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }
    if (url.toString().includes("api.resend.com")) {
      return new Response(JSON.stringify({ id: "email-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }
    return new Response("Not Found", { status: 404 })
  }
})

import { app } from "./index"

describe("Hono Auth Endpoints", () => {
  test("POST /auth/magic-link/request - success", async () => {
    const res = await app.request("/auth/magic-link/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "test@example.com",
        callbackURL: "http://localhost:3000/dashboard"
      })
    })

    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.success).toBe(true)
  })

  test("POST /auth/magic-link/request - invalid email", async () => {
    const res = await app.request("/auth/magic-link/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "not-an-email",
        callbackURL: "http://localhost:3000/dashboard"
      })
    })

    expect(res.status).toBe(400)
  })

  test("GET /auth/magic-link/verify - success", async () => {
    const res = await app.request("/auth/magic-link/verify?token=raw-token&email=test@example.com&callbackURL=http://localhost:3000/dashboard", {
      method: "GET"
    })

    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe("http://localhost:3000/dashboard")
    expect(res.headers.get("Set-Cookie")).toContain("better-auth.session_token=")
  })

  test("POST /auth/invite - unauthorized when no session", async () => {
    const res = await app.request("/auth/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "invited@example.com",
        role: "member",
        organizationId: "org-id"
      })
    })

    expect(res.status).toBe(401)
  })

  test("POST /auth/invite - success when authenticated", async () => {
    const res = await app.request("/auth/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "valid-session=true"
      },
      body: JSON.stringify({
        email: "invited@example.com",
        role: "member",
        organizationId: "org-id"
      })
    })

    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.success).toBe(true)
  })

  test("GET /auth/invite/accept - success redirect", async () => {
    const res = await app.request("/auth/invite/accept?id=mock-id&token=raw-token", {
      method: "GET"
    })

    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe("http://localhost:3000/")
    expect(res.headers.get("Set-Cookie")).toContain("better-auth.session_token=")
  })
})
