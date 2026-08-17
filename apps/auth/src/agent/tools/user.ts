import { toolDefinition } from "@tanstack/ai"
import {
  getCurrentUserNameInput,
  getCurrentUserNameOutput,
} from "@workspace/agent"
import { db, eq, schema } from "@workspace/database"
import type { AgentContext } from "../tool-ctx"

/**
 * `get_current_user_name`: returns strictly the display name of the currently signed-in user.
 * Strictly avoids exposing any PII (no email, phone, user ID, address, or roles).
 */
export function getCurrentUserNameTool(ctx: AgentContext) {
  return toolDefinition({
    name: "get_current_user_name",
    description:
      "Get the display name of the currently signed-in user strictly without any PII (no email, phone, or other personal identifiers).",
    inputSchema: getCurrentUserNameInput,
    outputSchema: getCurrentUserNameOutput,
    needsApproval: false,
  }).server(async () => {
    if (ctx.userName && ctx.userName.trim()) {
      return { name: ctx.userName.trim() }
    }

    const [u] = await db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, ctx.userId))
      .limit(1)

    return {
      name: u?.name || "User",
    }
  })
}
