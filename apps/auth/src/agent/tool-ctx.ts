import type { Context } from "hono"
import { type AgentContext, resolveOrgContext } from "./org-context"

/**
 * Request auth → agent execution context (02-§2 step 1).
 *
 * `buildToolContext` resolves the session → active organization → member →
 * org name chain. Every tool impl and the chat loop closes over the returned
 * context so all DB access is org-scoped.
 */
export function buildToolContext(c: Context<any>): Promise<AgentContext> {
  return resolveOrgContext(c)
}

export { AgentContextError, httpStatusFor } from "./org-context"
export type { AgentContext }
