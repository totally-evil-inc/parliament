import { and, db, eq } from "@workspace/database"
import { member, organization } from "@workspace/database/schema"
import type { Context } from "hono"

export interface AgentContext {
  organizationId: string
  userId: string
  userEmail: string
  userName?: string
  orgName: string
}

export type AgentContextErrorCode =
  | "unauthorized"
  | "no_organization"
  | "forbidden"

export class AgentContextError extends Error {
  constructor(
    public readonly code: AgentContextErrorCode,
    message = code
  ) {
    super(message)
    this.name = "AgentContextError"
  }
}

/**
 * Resolves the org-scoped agent context from the Hono session:
 * session → active organization → member-verified → org name.
 * Throws AgentContextError (401/403 semantics) when the caller cannot act.
 */
export async function resolveOrgContext(
  c: Context<{
    Variables: {
      user: { id: string; email: string; name?: string } | null
      session: { activeOrganizationId?: string | null } | null
    }
  }>
): Promise<AgentContext> {
  const user = c.get("user")
  if (!user) {
    throw new AgentContextError("unauthorized")
  }
  const activeOrganizationId = c.get("session")?.activeOrganizationId
  if (!activeOrganizationId) {
    throw new AgentContextError("no_organization")
  }

  const [membership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(
      and(
        eq(member.userId, user.id),
        eq(member.organizationId, activeOrganizationId)
      )
    )
    .limit(1)

  if (!membership) {
    throw new AgentContextError("forbidden")
  }

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, membership.organizationId))
    .limit(1)

  return {
    organizationId: membership.organizationId,
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    orgName: org?.name ?? "",
  }
}

export function httpStatusFor(code: AgentContextErrorCode): 401 | 403 {
  switch (code) {
    case "unauthorized":
      return 401
    case "no_organization":
      return 403
    case "forbidden":
      return 403
  }
}
