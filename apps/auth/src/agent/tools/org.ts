import { toolDefinition } from "@tanstack/ai"
import { verifyOrgAccessOutput } from "@workspace/agent"
import type { AgentContext } from "../tool-ctx"

/**
 * `verify_org_access` (04-§2.2): the loop's identity check.
 * Confirms which organization the agent is acting for. Read-only, auto-run.
 */
export function verifyOrgAccessTool(ctx: AgentContext) {
  return toolDefinition({
    name: "verify_org_access",
    description:
      "Verify which organization the current session belongs to. Returns the organization id and name. Call this when uncertain about the acting organization.",
    outputSchema: verifyOrgAccessOutput,
    needsApproval: false,
  }).server(async () => {
    return {
      organizationId: ctx.organizationId,
      organizationName: ctx.orgName,
    }
  })
}
