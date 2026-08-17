import { describe, expect, test } from "bun:test"
import { buildPrompt, generateSystemPrompt } from "./prompt"

describe("generateSystemPrompt & buildPrompt", () => {
  test("generates 3-tier prompt with organization and session date", () => {
    const prompt = generateSystemPrompt({
      orgName: "Acme Enterprises",
      date: "2026-08-18",
    })

    expect(prompt).toContain('Active Organization: "Acme Enterprises"')
    expect(prompt).toContain("Today's date is 2026-08-18")
    expect(prompt).toContain("Parliament is a dedicated sales")
  })

  test("embeds OpenUI component signatures and strict syntax rules", () => {
    const prompt = buildPrompt({
      organizationId: "org-1",
      userId: "user-1",
      userEmail: "test@example.com",
      userName: "Alex",
      orgName: "Test Org",
    })

    expect(prompt).toContain("## OpenUI Component Signatures:")
    expect(prompt).toContain("Stack(children: any[]")
    expect(prompt).toContain(
      "DataTable(columns: {key: string, header: string}[]"
    )
    expect(prompt).toContain("MetricGroup(metrics:")
    expect(prompt).toContain("DocumentSentCard(documentTitle:")
    expect(prompt).toContain("EventCard(summary:")
    expect(prompt).toContain("## Critical Syntax Rules:")
    expect(prompt).toContain("```openui-lang")
    expect(prompt).toContain("Example 1: Pipeline Metrics & Deals Table")
    expect(prompt).toContain("Example 2: Document Sent Confirmation Card")
  })
})
