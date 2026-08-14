import { toolDefinition } from "@tanstack/ai"
import { listIntegrationsOutput } from "@workspace/agent"
import { db, eq, schema } from "@workspace/database"
import type { AgentContext } from "../tool-ctx"

export function listIntegrationsTool(ctx: AgentContext) {
  return toolDefinition({
    name: "list_integrations",
    description:
      "List connected integration accounts (gmail, google-calendar, google-drive, linear, notion) for the current user.",
    outputSchema: listIntegrationsOutput,
    needsApproval: false,
  }).server(async () => {
    const rawAccounts = await db
      .select({
        id: schema.account.id,
        providerId: schema.account.providerId,
        createdAt: schema.account.createdAt,
      })
      .from(schema.account)
      .where(eq(schema.account.userId, ctx.userId))

    const validProviders = [
      "gmail",
      "google-calendar",
      "google-drive",
      "linear",
      "notion",
    ] as const

    const accounts = rawAccounts
      .filter(
        (a): a is typeof a & { providerId: (typeof validProviders)[number] } =>
          (validProviders as readonly string[]).includes(a.providerId)
      )
      .map((a) => ({
        id: a.id,
        providerId: a.providerId,
        connectedAt: a.createdAt.toISOString(),
      }))

    return { accounts }
  })
}
