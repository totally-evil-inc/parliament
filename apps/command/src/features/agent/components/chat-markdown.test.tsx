import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { ChatMarkdown } from "./chat-markdown"

describe("ChatMarkdown Component", () => {
  test("renders empty string or null gracefully", () => {
    const html = renderToString(<ChatMarkdown content="" />)
    expect(html).toBe("")
  })

  test("renders bold, headers, and bullet lists to semantic HTML", () => {
    const markdown = `
### What I can do for you
- **Deal & Pipeline Management** — Review pipeline health
- **Customer Management** — View profiles
`
    const html = renderToString(<ChatMarkdown content={markdown} />)

    expect(html).toContain("<h3")
    expect(html).toContain("What I can do for you")
    expect(html).toContain("<ul")
    expect(html).toContain("<li")
    expect(html).toContain("<strong")
    expect(html).toContain("Deal &amp; Pipeline Management")
    expect(html).not.toContain("###")
    expect(html).not.toContain("**Deal")
  })

  test("renders inline code, tables, and links", () => {
    const markdown = `
Check out \`create_proposal\` tool at [Parliament](https://parliament.ai).

| Step | Action |
| --- | --- |
| 1 | Discovery |
`
    const html = renderToString(<ChatMarkdown content={markdown} />)

    expect(html).toContain("<code")
    expect(html).toContain("create_proposal")
    expect(html).toContain("<a")
    expect(html).toContain('href="https://parliament.ai"')
    expect(html).toContain("<table")
    expect(html).toContain("<th")
    expect(html).toContain("Step")
  })
})
