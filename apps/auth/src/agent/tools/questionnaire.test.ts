import { describe, expect, test } from "bun:test"
import type { AgentContext } from "../tool-ctx"
import { askClarifyingQuestionsTool } from "./questionnaire"

describe("askClarifyingQuestionsTool Server Tool", () => {
  const ctx: AgentContext = {
    organizationId: "org-123",
    userId: "user-123",
    userEmail: "test@example.com",
    orgName: "Test Org",
  }

  test("executes and returns awaiting_user_input with question count", async () => {
    const tool = askClarifyingQuestionsTool(ctx)
    expect(tool.name).toBe("ask_clarifying_questions")
    expect(tool.needsApproval).toBe(false)

    const payload = {
      title: "Project Scope Clarification",
      subtitle: "Need scope and budget details",
      questions: [
        {
          id: "scope",
          question: "What is the project scope?",
          type: "single_choice" as const,
          options: [
            { label: "Frontend", value: "fe" },
            { label: "Backend", value: "be" },
          ],
        },
      ],
    }

    const result = await (tool as any).execute(payload)
    expect(result).toMatchObject({
      status: "awaiting_user_input",
      questionsCount: 1,
    })
    expect(result.message).toContain("1 clarifying question(s)")
  })
})
