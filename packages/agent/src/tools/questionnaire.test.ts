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

  test("askClarifyingQuestionsInput parses string array options and normalizes to option objects", () => {
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
      { label: "Next.js", value: "Next.js" },
      { label: "Vite + React", value: "Vite + React" },
      { label: "SvelteKit", value: "SvelteKit" },
    ])
  })

  test("askClarifyingQuestionsInput tolerates LLM variations: multiple_choice type, missing title/id, prompt field, wrapped parameters", () => {
    const llmDeviatedPayload = {
      parameters: {
        questions: [
          {
            prompt: "What is your budget?",
            type: "multiple_choice",
            choices: ["< $5,000", "$5,000 - $15,000", "> $15,000"],
          },
          {
            title: "Project Scope",
            type: "checkboxes",
            items: [
              { label: "Website", value: "web" },
              { text: "Mobile App", value: "mobile" },
            ],
          },
        ],
      },
    }

    const parsed = askClarifyingQuestionsInput.parse(llmDeviatedPayload)
    expect(parsed.title).toBe("Clarifying Questions")
    expect(parsed.questions).toHaveLength(2)
    expect(parsed.questions[0].type).toBe("single_choice")
    expect(parsed.questions[0].question).toBe("What is your budget?")
    expect(parsed.questions[0].id).toBeDefined()
    expect(parsed.questions[0].options).toEqual([
      { label: "< $5,000", value: "< $5,000" },
      { label: "$5,000 - $15,000", value: "$5,000 - $15,000" },
      { label: "> $15,000", value: "> $15,000" },
    ])
    expect(parsed.questions[1].type).toBe("multi_select")
    expect(parsed.questions[1].question).toBe("Project Scope")
  })

  test("askClarifyingQuestionsInput parses stringified JSON questions payload from LLMs", () => {
    const stringifiedQuestionsPayload = {
      questions: JSON.stringify([
        {
          id: "scope",
          type: "multi_select",
          label: "What should the web development project include?",
          options: [
            {
              label: "New marketing website",
              value: "marketing_site",
            },
            { label: "Student/parent portal", value: "portal" },
          ],
        },
        {
          id: "budget",
          type: "single_choice",
          label: "What is the approximate budget range?",
          options: [
            { label: "Under $25,000", value: "under_25k" },
            { label: "$25,000 - $50,000", value: "25k_50k" },
          ],
        },
      ]),
    }

    const parsed = askClarifyingQuestionsInput.parse(
      stringifiedQuestionsPayload
    )
    expect(parsed.title).toBe("Clarifying Questions")
    expect(parsed.questions).toHaveLength(2)
    expect(parsed.questions[0].id).toBe("scope")
    expect(parsed.questions[0].question).toBe(
      "What should the web development project include?"
    )
    expect(parsed.questions[0].type).toBe("multi_select")
    expect(parsed.questions[0].options).toHaveLength(2)
    expect(parsed.questions[1].id).toBe("budget")
    expect(parsed.questions[1].type).toBe("single_choice")
  })
})
