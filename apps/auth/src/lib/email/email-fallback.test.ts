import { describe, expect, it } from "bun:test"
import { renderEmail } from "../email"
import { renderInvitationEmailHtml } from "./templates/invitation"
import { renderMagicLinkEmailHtml } from "./templates/magic-link"

describe("Email Rendering & Fallback Sanitization", () => {
  it("escapes malicious payload in renderEmail unknown template fallback", async () => {
    const html = await renderEmail("unknown-template", {
      message: '<script>alert("hacked")</script> Hello!',
      url: 'javascript:alert("pwned")',
    })

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt; Hello!")
    expect(html).not.toContain("javascript:")
    expect(html).toBe("<p>&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt; Hello!</p>")
  })

  it("renders safe URL in renderEmail fallback when valid", async () => {
    const html = await renderEmail("unknown-template", {
      message: "Please visit",
      url: "https://example.com/login",
    })

    expect(html).toContain("<p>Please visit</p>")
    expect(html).toContain('<a href="https://example.com/login">https://example.com/login</a>')
  })

  it("escapes HTML and neutralizes unsafe URLs in invitation template", () => {
    const html = renderInvitationEmailHtml({
      orgName: '<b onmouseover="alert(1)">Acme</b>',
      inviterName: 'Admin <script>alert("x")</script>',
      email: 'user<victim>@test.com',
      url: 'javascript:alert("steal")',
    })

    expect(html).not.toContain("<script>")
    expect(html).not.toContain('onmouseover="alert(1)"')
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain("&lt;b onmouseover=&quot;alert(1)&quot;&gt;Acme&lt;/b&gt;")
    expect(html).toContain('href="#"')
  })

  it("escapes HTML and neutralizes unsafe URLs in magic-link template", () => {
    const html = renderMagicLinkEmailHtml({
      email: '<user@test.com">',
      url: 'data:text/html,<script>alert(1)</script>',
    })

    expect(html).not.toContain("<script>")
    expect(html).not.toContain('href="data:')
    expect(html).toContain("&lt;user@test.com&quot;&gt;")
    expect(html).toContain('href="#"')
  })
})
