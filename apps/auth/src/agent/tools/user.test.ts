import { describe, expect, test } from "bun:test"
import type { AgentContext } from "../tool-ctx"
import { getCurrentUserNameTool } from "./user"

describe("getCurrentUserNameTool Server Tool", () => {
  test("returns user display name strictly without PII from context", async () => {
    const ctx: AgentContext = {
      organizationId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      userEmail: "muchiri@example.com",
      userName: "Muchiri Nyaga",
      orgName: "Acme Agency",
    }

    const tool = getCurrentUserNameTool(ctx)
    expect(tool.name).toBe("get_current_user_name")
    expect(tool.needsApproval).toBe(false)

    const result = (await (tool as any).execute({})) as any
    // Strictly returns { name } without exposing email, userId, or other PII
    expect(result).toEqual({ name: "Muchiri Nyaga" })
    expect(result.email).toBeUndefined()
    expect(result.userId).toBeUndefined()
    expect(result.phone).toBeUndefined()
  })
})
