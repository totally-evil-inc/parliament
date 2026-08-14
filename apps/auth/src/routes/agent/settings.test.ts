import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { db, eq, schema } from "@workspace/database"
import type { AISettingsSummary } from "../../agent/provider"
import { app } from "../../index"

describe("agent settings route (GET/PATCH/DELETE /api/agent/settings/ai)", () => {
  let orgId: string
  let userId: string

  beforeAll(async () => {
    const now = new Date()
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Settings Route Org",
        slug: `settings-route-org-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    orgId = org.id

    const [user] = await db
      .insert(schema.user)
      .values({
        id: crypto.randomUUID(),
        name: "Settings Tester",
        email: `settings-${crypto.randomUUID()}@test.local`,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    userId = user.id

    await db.insert(schema.member).values({
      organizationId: orgId,
      userId,
      role: "owner",
      createdAt: now,
    })
  })

  afterAll(async () => {
    if (orgId) {
      await db
        .delete(schema.aiSettings)
        .where(eq(schema.aiSettings.organizationId, orgId))
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgId))
    }
    if (userId) {
      await db.delete(schema.user).where(eq(schema.user.id, userId))
    }
  })

  const withSession = (email: string) => ({
    headers: {
      "x-test-session-email": email,
      "x-test-org-id": orgId,
      "x-test-user-id": userId,
      "Content-Type": "application/json",
    },
  })

  test("401 without session", async () => {
    const res = await app.request("/api/agent/settings/ai")
    expect(res.status).toBe(401)
  })

  test("GET /api/agent/settings/ai returns public config summary", async () => {
    const res = await app.request("/api/agent/settings/ai", {
      method: "GET",
      ...withSession("settings-test@local"),
    })

    expect(res.status).toBe(200)
    const data = (await res.json()) as AISettingsSummary
    expect(data.baseUrl).toBeDefined()
    expect(data.defaultModel).toBeDefined()
    expect(typeof data.apiKeySet).toBe("boolean")
    expect((data as unknown as Record<string, unknown>).apiKey).toBeUndefined()
  })

  test("GET /api/agent/models returns dynamic models list and defaultModel", async () => {
    const res = await app.request("/api/agent/models", {
      method: "GET",
      ...withSession("settings-test@local"),
    })

    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      defaultModel: string
      models: Array<{ id: string; name: string }>
    }
    expect(data.defaultModel).toBeDefined()
    expect(Array.isArray(data.models)).toBe(true)
    expect(data.models.length).toBeGreaterThan(0)
    expect(data.models.some((m) => m.id === data.defaultModel)).toBe(true)
  })

  test("PATCH and DELETE /api/agent/settings/ai updates and deletes org settings", async () => {
    const patchRes = await app.request("/api/agent/settings/ai", {
      method: "PATCH",
      ...withSession("settings-test@local"),
      body: JSON.stringify({
        apiKey: "sk-or-v1-1234567890abcdef",
        baseUrl: "https://openrouter.ai/api/v1",
        defaultModel: "anthropic/claude-3.5-sonnet",
      }),
    })

    expect(patchRes.status).toBe(200)
    const patchData = (await patchRes.json()) as AISettingsSummary
    expect(patchData.apiKeySet).toBe(true)
    expect(patchData.maskedApiKey).toBe("sk-o••••cdef")
    expect(patchData.baseUrl).toBe("https://openrouter.ai/api/v1")
    expect(patchData.defaultModel).toBe("anthropic/claude-3.5-sonnet")
    expect(patchData.source).toBe("db")

    const deleteRes = await app.request("/api/agent/settings/ai", {
      method: "DELETE",
      ...withSession("settings-test@local"),
    })

    expect(deleteRes.status).toBe(200)
    const deleteData = (await deleteRes.json()) as {
      message: string
      config: AISettingsSummary
    }
    expect(deleteData.message).toContain("deleted successfully")
    expect(deleteData.config.source).not.toBe("db")
  })
})
