import { describe, expect, test } from "bun:test"
import { formatMarkdownToEmailHtml, renderEmail } from "./email"

describe("Email Template & Markdown Rendering", () => {
  test("renders document-dispatch template in-process with branded elements", async () => {
    const html = await renderEmail("document-dispatch", {
      documentType: "proposal",
      documentTitle: "Stark Industries Web Modernization",
      personalMessage:
        "Hi Tony,\n\nPlease review our proposal for the upcoming digital transformation.\n\nKey highlights:\n- Phase 1: Foundation\n- Phase 2: Platform launch\n\nBest regards,\nParliament Team",
      shareUrl: "https://gate.parliament.dev/p/sample-token-123",
      recipientEmail: "tony@starkindustries.com",
    })

    expect(html).toBeTypeOf("string")
    expect(html).toContain("PARLIAMENT")
    expect(html).toContain("PROPOSAL")
    expect(html).toContain("Stark Industries Web Modernization")
    expect(html).toContain("View Proposal")
    expect(html).toContain("https://gate.parliament.dev/p/sample-token-123")
    expect(html).toContain("tony@starkindustries.com")
    // Verify markdown rendering inside personalMessage
    expect(html).toContain("Hi Tony,")
    expect(html).toContain("Phase 1: Foundation")
    expect(html).toContain("<li")
  })

  test("renders invoice dispatch template with invoice badge and button", async () => {
    const html = await renderEmail("document-dispatch", {
      documentType: "invoice",
      documentTitle: "Invoice #INV-2026-001",
      personalMessage: "Please find your itemized invoice attached.",
      shareUrl: "https://gate.parliament.dev/i/inv-token-456",
      recipientEmail: "billing@wayne.com",
    })

    expect(html).toContain("PARLIAMENT")
    expect(html).toContain("INVOICE")
    expect(html).toContain("Invoice #INV-2026-001")
    expect(html).toContain("View Invoice")
    expect(html).toContain("https://gate.parliament.dev/i/inv-token-456")
  })

  test("formatMarkdownToEmailHtml converts bold, lists, paragraphs and links cleanly", () => {
    const markdown =
      "Hello **Client**,\n\nHere is the plan:\n- Item 1\n- Item 2\n\nVisit [Our Site](https://example.com) for details."
    const html = formatMarkdownToEmailHtml(markdown)

    expect(html).toContain("<strong>Client</strong>")
    expect(html).toContain("<ul")
    expect(html).toContain("<li")
    expect(html).toContain("Item 1")
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain("Our Site</a>")
  })

  test("formatMarkdownToEmailHtml strips raw internal localhost draft URLs", () => {
    const textWithInternalUrl =
      "Please check http://localhost:3000/proposals/5e2619aa-9dc3-4fd1-a84b-f961fb8d1744 for review."
    const html = formatMarkdownToEmailHtml(textWithInternalUrl)

    expect(html).not.toContain("localhost:3000/proposals")
  })
})
