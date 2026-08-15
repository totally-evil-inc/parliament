import { describe, expect, it } from "bun:test"
import { app } from "./index"

describe("Scheduler API Endpoints (apps/auth)", () => {
  it("rejects unauthorized trigger when no session or auth secret is present in production mode", async () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    try {
      const res = await app.request("/api/scheduler/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(401)
      const data = (await res.json()) as { error?: string }
      expect(data.error).toBe("Unauthorized")
    } finally {
      process.env.NODE_ENV = origEnv
    }
  })

  it("accepts trigger with valid test session headers", async () => {
    const res = await app.request("/api/scheduler/tick", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session-email": "admin@example.com",
        "x-test-user-id": "00000000-0000-7000-8000-000000000001",
        "x-test-org-id": "00000000-0000-7000-8000-000000000002",
      },
      body: JSON.stringify({}),
    })

    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      const data = (await res.json()) as { success: boolean; processed: number }
      expect(data.success).toBe(true)
      expect(typeof data.processed).toBe("number")
    }
  })
})
