import { describe, expect, test } from "bun:test"
import {
  askClarifyingQuestionsInput,
  askClarifyingQuestionsOutput,
  TOOL_CATALOG,
} from "../index"

describe("Questionnaire Tool Schemas & Catalog", () => {
  test("TOOL_CATALOG contains ask_clarifying_questions entry", () => {
    expect(TOOL_CATALOG.ask_clarifying_questions).toBeDefined()
    expect(TOOL_CATALOG.ask_clarifying_questions.category).toBe("read")
    expect(TOOL_CATALOG.ask_clarifying_questions.needsApproval).toBe(false)
  })

  test("askClarifyingQuestionsInput validates single choice and multi select questions", () => {
    const validPayload = {
      title: "Web Development Proposal Requirements",
      subtitle: "Please clarify project scope and budget",
      questions: [
        {
          id: "project_scope",
          question: "What is the primary scope of the project?",
          type: "single_choice" as const,
          options: [
            { label: "Full-Stack Web Application", value: "fullstack" },
            { label: "Marketing / Landing Page", value: "landing" },
            { label: "E-Commerce Store", value: "ecommerce" },
          ],
          required: true,
        },
        {
          id: "deliverables",
          question: "Which deliverables are required?",
          type: "multi_select" as const,
          options: [
            { label: "UI/UX Design", value: "design" },
            { label: "Frontend Development", value: "frontend" },
            { label: "Backend API & Database", value: "backend" },
            { label: "SEO & Performance Tuning", value: "seo" },
          ],
          required: false,
        },
        {
          id: "budget",
          question: "What is the estimated budget?",
          type: "text" as const,
          placeholder: "e.g. $8,000 USD",
          required: true,
        },
      ],
      submitButtonText: "Submit Project Details",
    }

    const parsed = askClarifyingQuestionsInput.parse(validPayload)
    expect(parsed.title).toBe("Web Development Proposal Requirements")
    expect(parsed.questions).toHaveLength(3)
    expect(parsed.questions[0].options).toHaveLength(3)
  })

  test("askClarifyingQuestionsOutput validates awaiting_user_input status", () => {
    const output = {
      status: "awaiting_user_input" as const,
      message: "Presented 3 clarifying question(s) to the user.",
      questionsCount: 3,
    }

    const parsed = askClarifyingQuestionsOutput.parse(output)
    expect(parsed.status).toBe("awaiting_user_input")
    expect(parsed.questionsCount).toBe(3)
  })

  test("askClarifyingQuestionsInput parses string array options flexibly", () => {
    const payloadWithStrings = {
      title: "Web Development Proposal Requirements",
      questions: [
        {
          id: "tech_stack",
          question: "Which framework do you prefer?",
          type: "single_choice" as const,
          options: ["Next.js", "Vite + React", "SvelteKit"],
        },
      ],
    }

    const parsed = askClarifyingQuestionsInput.parse(payloadWithStrings)
    expect(parsed.questions[0].options).toEqual([
      "Next.js",
      "Vite + React",
      "SvelteKit",
    ])
  })
})
