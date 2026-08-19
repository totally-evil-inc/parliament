import { describe, expect, test } from "bun:test"
import {
  formatInlineMarkdown,
  formatMarkdownToEmailHtml,
} from "./format-markdown"

describe("format-markdown email utilities", () => {
  describe("formatMarkdownToEmailHtml defensive inputs", () => {
    test("handles non-string, null, undefined, and empty inputs gracefully", () => {
      expect(formatMarkdownToEmailHtml(null)).toBe("")
      expect(formatMarkdownToEmailHtml(undefined)).toBe("")
      expect(formatMarkdownToEmailHtml("")).toBe("")
      expect(formatMarkdownToEmailHtml("   ")).toBe("")
      expect(formatMarkdownToEmailHtml(123 as any)).toBe("")
      expect(formatMarkdownToEmailHtml({} as any)).toBe("")
      expect(formatMarkdownToEmailHtml([] as any)).toBe("")
    })

    test("strips internal localhost draft URLs defensively", () => {
      const input =
        "Review this proposal: http://localhost:3000/proposals/123e4567-e89b-12d3-a456-426614174000 then reply."
      const result = formatMarkdownToEmailHtml(input)
      expect(result).not.toContain("localhost:3000")
      expect(result).not.toContain("123e4567-e89b-12d3-a456-426614174000")
      expect(result).toContain("Review this proposal:  then reply.")
    })

    test("converts paragraphs and bullet lists correctly", () => {
      const input = `Hello,\n\nHere are the details:\n- Item 1\n- Item 2\n\nBest regards,\nParliament Team`
      const result = formatMarkdownToEmailHtml(input)
      expect(result).toContain("<p style=\"margin: 0 0 10px 0; line-height: 1.6; color: #334155;\">Hello,</p>")
      expect(result).toContain("<ul style=\"margin: 8px 0; padding-left: 20px;\"><li style=\"margin-bottom: 4px; line-height: 1.5; color: #334155;\">Item 1</li><li style=\"margin-bottom: 4px; line-height: 1.5; color: #334155;\">Item 2</li></ul>")
      expect(result).toContain("Best regards,<br />Parliament Team")
    })
  })

  describe("formatInlineMarkdown security and markdown parsing", () => {
    test("escapes HTML characters to prevent XSS", () => {
      const input = `<script>alert('xss')</script> & "quotes"`
      const result = formatInlineMarkdown(input)
      expect(result).not.toContain("<script>")
      expect(result).toContain("&lt;script&gt;")
      expect(result).toContain("&quot;quotes&quot;")
      expect(result).toContain("&#039;xss&#039;")
    })

    test("safely renders bold and italics", () => {
      const input = "This is **bold** and *italic* and __also bold__ and _also italic_."
      const result = formatInlineMarkdown(input)
      expect(result).toContain("<strong>bold</strong>")
      expect(result).toContain("<em>italic</em>")
      expect(result).toContain("<strong>also bold</strong>")
      expect(result).toContain("<em>also italic</em>")
    })

    test("allows safe HTTP and HTTPS markdown links", () => {
      const input = "Check out [our website](https://example.com/pricing)."
      const result = formatInlineMarkdown(input)
      expect(result).toContain('<a href="https://example.com/pricing" style="color: #0f172a; text-decoration: underline;">our website</a>')
    })

    test("neutralizes dangerous javascript: or data: URIs", () => {
      const input = "Click [here](javascript:alert(1)) or [download](data:text/html,<script>alert(1)</script>)."
      const result = formatInlineMarkdown(input)
      expect(result).not.toContain("<a href=\"javascript:")
      expect(result).not.toContain("<a href=\"data:")
    })
  })
})
