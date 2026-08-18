import { describe, expect, it } from "bun:test"
import { escapeHtml, sanitizeEmailUrl } from "../escape-html"
import { renderDocumentDispatchEmailHtml } from "./document-dispatch"

describe("Email HTML Escaping & Sanitization", () => {
  it("escapes special HTML characters safely", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    )
    expect(escapeHtml(`"hello" & 'world'`)).toBe(
      "&quot;hello&quot; &amp; &#39;world&#39;"
    )
    expect(escapeHtml(null)).toBe("")
    expect(escapeHtml(undefined)).toBe("")
  })

  it("sanitizes URLs defensively", () => {
    expect(sanitizeEmailUrl("https://example.com/view/123")).toBe(
      "https://example.com/view/123"
    )
    expect(sanitizeEmailUrl("http://localhost:3000/proposals/456")).toBe(
      "http://localhost:3000/proposals/456"
    )
    expect(sanitizeEmailUrl("/proposals/789")).toBe("/proposals/789")
    expect(sanitizeEmailUrl("javascript:alert(1)")).toBe("#")
    expect(sanitizeEmailUrl("data:text/html,<script>alert(1)</script>")).toBe(
      "#"
    )
    expect(sanitizeEmailUrl("")).toBe("#")
    expect(sanitizeEmailUrl(null)).toBe("#")
  })

  it("renders document dispatch email with escaped user and LLM inputs", () => {
    const html = renderDocumentDispatchEmailHtml({
      documentType: "proposal",
      documentTitle: '<img src="x" onerror="alert(1)"> Q4 "Proposal" & Strategy',
      shareUrl: "https://parliament.app/gate/proposal-123",
      recipientEmail: '<victim@example.com">',
      personalMessage: "Please review the **scope** and *deliverables*.",
    })

    expect(html).not.toContain("<img src=")
    expect(html).toContain("&lt;img src=&quot;x&quot;")
    expect(html).toContain("Q4 &quot;Proposal&quot; &amp; Strategy")
    expect(html).toContain("&lt;victim@example.com&quot;&gt;")
    expect(html).toContain("<strong>scope</strong>")
    expect(html).toContain("<em>deliverables</em>")
    expect(html).toContain('href="https://parliament.app/gate/proposal-123"')
  })

  it("neutralizes malicious JavaScript URLs in shareUrl", () => {
    const html = renderDocumentDispatchEmailHtml({
      documentType: "invoice",
      documentTitle: "Enterprise Invoice #104",
      shareUrl: "javascript:alert(document.cookie)",
      recipientEmail: "client@test.com",
    })

    expect(html).not.toContain("javascript:")
    expect(html).toContain('href="#"')
  })
})
