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
      "Verify organization context: returns the current organization id and name. Internal diagnostic tool; do not call for conversational queries or greetings.",
    outputSchema: verifyOrgAccessOutput,
    needsApproval: false,
  }).server(async () => {
    return {
      organizationId: ctx.organizationId,
      organizationName: ctx.orgName,
    }
  })
}
