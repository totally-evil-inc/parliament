import type { AnyTextAdapter } from "@tanstack/ai/adapters"
import { createOpenaiChatCompletions } from "@tanstack/ai-openai"
import { resolveModel } from "@workspace/agent"
import { asc, db, eq, schema } from "@workspace/database"

export interface AIConfigSummary {
  apiKeySet: boolean
  maskedApiKey: string | null
  baseUrl: string
  defaultModel: string
  source: "db" | "env" | "none"
}
export interface ResolvedAIConfig extends AIConfigSummary {
  apiKey: string
}
export interface ProviderSummary extends AIConfigSummary {
  id: string
  name: string
  isActive: boolean
}
export interface AISettingsList {
  providers: ProviderSummary[]
  activeProvider: ProviderSummary | null
  fallback: AIConfigSummary
}

export function maskApiKey(key: string | null | undefined): string | null {
  if (!key?.trim()) return null
  const value = key.trim()
  return value.length <= 8
    ? "••••"
    : `${value.slice(0, 4)}••••${value.slice(-4)}`
}

function envConfig(): ResolvedAIConfig {
  // Provider settings are organization-scoped and database-owned. Do not use
  // environment variables as credentials, endpoints, or model fallbacks.
  return {
    apiKey: "",
    apiKeySet: false,
    maskedApiKey: null,
    baseUrl: "",
    defaultModel: "",
    source: "none",
  }
}

function summary(
  row: typeof schema.aiSettings.$inferSelect,
  env: ResolvedAIConfig
): ProviderSummary {
  const apiKey = row.apiKey?.trim() || env.apiKey
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    apiKeySet: !!apiKey,
    maskedApiKey: maskApiKey(apiKey),
    baseUrl: row.baseUrl?.trim() || env.baseUrl,
    defaultModel: resolveModel(row.defaultModel?.trim() || env.defaultModel),
    source: "db",
  }
}

export async function listAISettings(
  organizationId: string
): Promise<AISettingsList> {
  const env = envConfig()
  const rows = await db
    .select()
    .from(schema.aiSettings)
    .where(eq(schema.aiSettings.organizationId, organizationId))
    .orderBy(asc(schema.aiSettings.createdAt))
  const providers = rows.map((row) => summary(row, env))
  const { apiKey: _apiKey, ...fallback } = env
  return {
    providers,
    activeProvider: providers.find((p) => p.isActive) ?? providers[0] ?? null,
    fallback,
  }
}

export async function resolveAIConfig(
  organizationId: string
): Promise<ResolvedAIConfig> {
  const env = envConfig()
  const rows = await db
    .select()
    .from(schema.aiSettings)
    .where(eq(schema.aiSettings.organizationId, organizationId))
    .orderBy(asc(schema.aiSettings.createdAt))
  const row = rows.find((item) => item.isActive) ?? rows[0]
  if (!row) return env
  const apiKey = row.apiKey?.trim() || env.apiKey
  const baseUrl = row.baseUrl?.trim() || env.baseUrl
  const defaultModel = resolveModel(
    row.defaultModel?.trim() || env.defaultModel
  )
  return {
    apiKey,
    apiKeySet: !!apiKey,
    maskedApiKey: maskApiKey(apiKey),
    baseUrl,
    defaultModel,
    source: "db",
  }
}

export type AISettingsSummary = AIConfigSummary

/**
 * Defensively harden adapter methods against missing or undefined content,
 * preventing `Cannot read properties of undefined (reading 'filter')` during
 * Chat Completions message serialization.
 */
export function patchAdapterForSafety<T extends AnyTextAdapter>(adapter: T): T {
  if (!adapter || typeof adapter !== "object") return adapter

  const anyAdapter = adapter as any

  const originalExtract = anyAdapter.extractTextContent
  if (typeof originalExtract === "function") {
    anyAdapter.extractTextContent = function (content: unknown): string {
      if (content === null || content === undefined) return ""
      if (typeof content === "string") return content
      if (!Array.isArray(content)) return ""
      return content
        .filter((p: any) => p && typeof p === "object" && p.type === "text")
        .map((p: any) => p.content ?? p.text ?? "")
        .join("")
    }
  }

  // Chat-completions adapters also call normalizeContent() for user
  // messages. A UI message can briefly contain an omitted/undefined content
  // field while an approval response is being assembled. The upstream
  // implementation assumes this is always an array and calls `.filter()` on
  // it, which aborts the whole turn before the approved tool can run.
  const originalNormalizeContent = anyAdapter.normalizeContent
  if (typeof originalNormalizeContent === "function") {
    anyAdapter.normalizeContent = function (content: unknown): any[] {
      if (content === null || content === undefined) return []
      if (typeof content === "string") {
        return [{ type: "text", content }]
      }
      if (!Array.isArray(content)) return []
      return content.filter(
        (part) =>
          part && typeof part === "object" && typeof part.type === "string"
      )
    }
  }

  const originalConvert = anyAdapter.convertMessage
  if (typeof originalConvert === "function") {
    anyAdapter.convertMessage = function (message: any): any {
      if (!message || typeof message !== "object") {
        return { role: "user", content: "" }
      }
      const safeMessage = {
        ...message,
        content: message.content !== undefined ? message.content : null,
      }
      return originalConvert.call(this, safeMessage)
    }
  }

  return adapter
}

export async function getAIAdapter(
  organizationId: string,
  modelOverride?: string | null
): Promise<{ adapter: AnyTextAdapter; model: string }> {
  const config = await resolveAIConfig(organizationId)
  const model = resolveModel(modelOverride || config.defaultModel)
  if (!config.apiKey || !config.baseUrl || !model) {
    throw new Error(
      "AI provider is not configured. Set an organization AI API key, endpoint, and default model in settings."
    )
  }
  // OpenAI-compatible endpoints use Chat Completions
  // (/v1/chat/completions), not OpenAI Responses (/v1/responses).
  const adapter = createOpenaiChatCompletions(
    model as Parameters<typeof createOpenaiChatCompletions>[0],
    config.apiKey || "dummy-key-for-offline-dev",
    { baseURL: config.baseUrl }
  ) as unknown as AnyTextAdapter

  patchAdapterForSafety(adapter)

  return { adapter, model }
}
