import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { resolveModel } from "@workspace/agent"
import { asc, db, eq, schema } from "@workspace/database"
import type { LanguageModel } from "ai"

export interface AIConfigSummary {
  apiKeySet: boolean
  maskedApiKey: string | null
  baseUrl: string
  defaultModel: string
  source: "db" | "env" | "none"
}

export interface AISettingsSummary extends AIConfigSummary {}

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

/**
 * Resolves a high-performance LanguageModel instance for the organization
 * using Vercel AI SDK Core.
 */
export async function getLanguageModel(
  organizationId: string,
  modelOverride?: string | null
): Promise<{ model: LanguageModel; modelName: string }> {
  const config = await resolveAIConfig(organizationId)
  const modelName = resolveModel(modelOverride || config.defaultModel)

  if (!config.apiKey || !config.baseUrl || !modelName) {
    throw new Error(
      "AI provider is not configured. Set an organization AI API key, endpoint, and default model in settings."
    )
  }

  // Detect Anthropic vs OpenAI / OpenRouter endpoints
  if (
    config.baseUrl.includes("anthropic.com") ||
    modelName.startsWith("claude-") ||
    modelName.startsWith("anthropic/")
  ) {
    if (config.baseUrl.includes("openrouter.ai")) {
      const openRouter = createOpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
      })
      return { model: openRouter(modelName), modelName }
    }
    const anthropic = createAnthropic({
      baseURL: config.baseUrl.includes("anthropic.com") ? config.baseUrl : undefined,
      apiKey: config.apiKey,
    })
    const cleanAnthropicName = modelName.replace(/^anthropic\//, "")
    return { model: anthropic(cleanAnthropicName), modelName }
  }

  const openai = createOpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  })

  return { model: openai(modelName), modelName }
}
