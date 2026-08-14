import { and, db, eq, schema } from "@workspace/database"
import { logWideEvent } from "@workspace/logger"
import { Hono } from "hono"
import { z } from "zod"
import { AgentContextError, httpStatusFor } from "../../agent/org-context"
import { listAISettings, resolveAIConfig } from "../../agent/provider"
import { type AgentContext, buildToolContext } from "../../agent/tool-ctx"

const providerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  apiKey: z.string().nullable().optional(),
  baseUrl: z.string().nullable().optional(),
  defaultModel: z.string().nullable().optional(),
})
const updateSchema = providerSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })

export const agentSettingsRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: { activeOrganizationId?: string | null } | null
  }
}>()

agentSettingsRouter.get("/models", async (c) => {
  let ctx: AgentContext
  try {
    ctx = await buildToolContext(c)
  } catch (err) {
    if (err instanceof AgentContextError)
      return c.json(
        { error: { code: err.code, message: err.message } },
        httpStatusFor(err.code) as never
      )
    throw err
  }
  const config = await resolveAIConfig(ctx.organizationId)
  const providerSettings = await listAISettings(ctx.organizationId)
  const providerName = providerSettings.activeProvider?.name ?? "Not configured"
  let fetched: Array<{ id: string; name: string; provider: string }> = []
  if (config.apiKeySet && config.baseUrl) {
    try {
      const base = config.baseUrl.replace(/\/+$/, "")
      const res = await fetch(
        `${base.endsWith("/v1") ? base : `${base}/v1`}/models`,
        {
          headers: config.apiKey
            ? { Authorization: `Bearer ${config.apiKey}` }
            : {},
          signal: AbortSignal.timeout(3000),
        }
      )
      const json = (await res.json().catch(() => null)) as {
        data?: Array<{ id?: string; name?: string }>
      } | null
      if (res.ok && Array.isArray(json?.data))
        fetched = json.data
          .filter((m): m is { id: string; name?: string } => !!m.id)
          .slice(0, 100)
          .map((m) => ({
            id: m.id,
            name: m.name || m.id,
            provider: providerName,
          }))
    } catch {
      /* provider unavailable */
    }
  }
  if (!fetched.some((m) => m.id === config.defaultModel))
    fetched.unshift({
      id: config.defaultModel,
      name: config.defaultModel,
      provider: providerName,
    })
  logWideEvent({
    event: "agent.models.listed",
    outcome: "success",
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    metadata: { count: fetched.length },
  })
  return c.json({ defaultModel: config.defaultModel, models: fetched })
})

agentSettingsRouter.get("/settings/ai", async (c) => {
  try {
    const ctx = await buildToolContext(c)
    const settings = await listAISettings(ctx.organizationId)
    return c.json({ ...settings.fallback, ...settings })
  } catch (err) {
    if (err instanceof AgentContextError)
      return c.json(
        { error: { code: err.code, message: err.message } },
        httpStatusFor(err.code) as never
      )
    throw err
  }
})

agentSettingsRouter.post("/settings/ai", async (c) => {
  let ctx: AgentContext
  try {
    ctx = await buildToolContext(c)
  } catch (err) {
    if (err instanceof AgentContextError)
      return c.json(
        { error: { code: err.code, message: err.message } },
        httpStatusFor(err.code) as never
      )
    throw err
  }
  const parsed = providerSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success)
    return c.json(
      {
        code: "invalid_body",
        message: "Invalid provider configuration",
        issues: parsed.error.issues,
      },
      422
    )
  const { name, apiKey, baseUrl, defaultModel } = parsed.data
  const existing = await db
    .select({ id: schema.aiSettings.id })
    .from(schema.aiSettings)
    .where(
      and(
        eq(schema.aiSettings.organizationId, ctx.organizationId),
        eq(schema.aiSettings.name, name)
      )
    )
    .limit(1)
  if (existing.length)
    return c.json(
      {
        code: "duplicate_provider",
        message: "A provider with this name already exists",
      },
      409
    )
  const rows = await db
    .select({ id: schema.aiSettings.id })
    .from(schema.aiSettings)
    .where(eq(schema.aiSettings.organizationId, ctx.organizationId))
    .limit(1)
  await db.insert(schema.aiSettings).values({
    organizationId: ctx.organizationId,
    name,
    apiKey: apiKey ?? null,
    baseUrl: baseUrl ?? null,
    defaultModel: defaultModel ?? null,
    isActive: rows.length === 0,
  })
  return c.json(await listAISettings(ctx.organizationId), 201)
})

agentSettingsRouter.patch("/settings/ai", async (c) => {
  let ctx: AgentContext
  try {
    ctx = await buildToolContext(c)
  } catch (err) {
    if (err instanceof AgentContextError)
      return c.json(
        { error: { code: err.code, message: err.message } },
        httpStatusFor(err.code) as never
      )
    throw err
  }
  const body = await c.req.json().catch(() => ({}))
  const parsed = providerSchema.partial().safeParse(body)
  if (!parsed.success)
    return c.json(
      { code: "invalid_body", message: "Invalid provider configuration" },
      422
    )
  const rows = await db
    .select()
    .from(schema.aiSettings)
    .where(eq(schema.aiSettings.organizationId, ctx.organizationId))
    .limit(1)
  if (rows[0])
    await db
      .update(schema.aiSettings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.aiSettings.id, rows[0].id))
  else
    await db.insert(schema.aiSettings).values({
      organizationId: ctx.organizationId,
      name: "Default Provider",
      isActive: true,
      apiKey: parsed.data.apiKey ?? null,
      baseUrl: parsed.data.baseUrl ?? null,
      defaultModel: parsed.data.defaultModel ?? null,
    })
  const settings = await listAISettings(ctx.organizationId)
  return c.json(settings.activeProvider ?? settings.fallback)
})

agentSettingsRouter.delete("/settings/ai", async (c) => {
  let ctx: AgentContext
  try {
    ctx = await buildToolContext(c)
  } catch (err) {
    if (err instanceof AgentContextError)
      return c.json(
        { error: { code: err.code, message: err.message } },
        httpStatusFor(err.code) as never
      )
    throw err
  }
  await db
    .delete(schema.aiSettings)
    .where(eq(schema.aiSettings.organizationId, ctx.organizationId))
  const settings = await listAISettings(ctx.organizationId)
  return c.json({
    message: "AI provider configuration deleted successfully",
    config: settings.fallback,
  })
})

agentSettingsRouter.patch("/settings/ai/:id", async (c) => {
  let ctx: AgentContext
  try {
    ctx = await buildToolContext(c)
  } catch (err) {
    if (err instanceof AgentContextError)
      return c.json(
        { error: { code: err.code, message: err.message } },
        httpStatusFor(err.code) as never
      )
    throw err
  }
  const parsed = updateSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success)
    return c.json(
      {
        code: "invalid_body",
        message: "Invalid provider configuration",
        issues: parsed.error.issues,
      },
      422
    )
  const id = c.req.param("id")
  const [row] = await db
    .select()
    .from(schema.aiSettings)
    .where(
      and(
        eq(schema.aiSettings.id, id),
        eq(schema.aiSettings.organizationId, ctx.organizationId)
      )
    )
    .limit(1)
  if (!row)
    return c.json({ code: "not_found", message: "Provider not found" }, 404)
  if (parsed.data.name && parsed.data.name !== row.name) {
    const dup = await db
      .select({ id: schema.aiSettings.id })
      .from(schema.aiSettings)
      .where(
        and(
          eq(schema.aiSettings.organizationId, ctx.organizationId),
          eq(schema.aiSettings.name, parsed.data.name)
        )
      )
      .limit(1)
    if (dup.length)
      return c.json(
        {
          code: "duplicate_provider",
          message: "A provider with this name already exists",
        },
        409
      )
  }
  if (parsed.data.isActive)
    await db
      .update(schema.aiSettings)
      .set({ isActive: false })
      .where(eq(schema.aiSettings.organizationId, ctx.organizationId))
  await db
    .update(schema.aiSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schema.aiSettings.id, id))
  return c.json(await listAISettings(ctx.organizationId))
})

agentSettingsRouter.delete("/settings/ai/:id", async (c) => {
  let ctx: AgentContext
  try {
    ctx = await buildToolContext(c)
  } catch (err) {
    if (err instanceof AgentContextError)
      return c.json(
        { error: { code: err.code, message: err.message } },
        httpStatusFor(err.code) as never
      )
    throw err
  }
  const id = c.req.param("id")
  const [row] = await db
    .select()
    .from(schema.aiSettings)
    .where(
      and(
        eq(schema.aiSettings.id, id),
        eq(schema.aiSettings.organizationId, ctx.organizationId)
      )
    )
    .limit(1)
  if (!row)
    return c.json({ code: "not_found", message: "Provider not found" }, 404)
  await db.delete(schema.aiSettings).where(eq(schema.aiSettings.id, id))
  if (row.isActive) {
    const [next] = await db
      .select({ id: schema.aiSettings.id })
      .from(schema.aiSettings)
      .where(eq(schema.aiSettings.organizationId, ctx.organizationId))
      .limit(1)
    if (next)
      await db
        .update(schema.aiSettings)
        .set({ isActive: true })
        .where(eq(schema.aiSettings.id, next.id))
  }
  return c.json(await listAISettings(ctx.organizationId))
})
