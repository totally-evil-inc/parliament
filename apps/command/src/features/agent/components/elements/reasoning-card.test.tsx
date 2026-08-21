import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { ReasoningCard } from "./reasoning-card"

describe("ReasoningCard Component", () => {
  test("returns null when no thinking text and not streaming", () => {
    const html = renderToString(<ReasoningCard />)
    expect(html).toBe("")
  })

  test("renders streaming Thinking state with shimmer and ping indicator", () => {
    const html = renderToString(
      <ReasoningCard
        thinking="Analyzing client requirements..."
        isStreaming={true}
      />
    )

    expect(html).toContain("Thinking…")
    expect(html).toContain("Analyzing client requirements...")
    expect(html).toContain("reasoning-trigger")
  })

  test("renders active streaming shell when isStreaming is true but thinking text is initially empty", () => {
    const html = renderToString(
      <ReasoningCard thinking="" isStreaming={true} />
    )

    expect(html).toContain("Thinking…")
    expect(html).toContain("reasoning-trigger")
    // Nested scroll area is not yet rendered when thinking is empty
    expect(html).not.toContain("whitespace-pre-wrap")
  })

  test("renders thinking scroll area once thinking text arrives during streaming", () => {
    const html = renderToString(
      <ReasoningCard
        thinking="Step 1: Reading document metadata"
        isStreaming={true}
      />
    )

    expect(html).toContain("Thinking…")
    expect(html).toContain("Step 1: Reading document metadata")
    expect(html).toContain("select-text")
  })

  test("renders completed thought with duration label", () => {
    const html = renderToString(
      <ReasoningCard
        thinking="Strategy synthesis completed."
        isStreaming={false}
        duration={8}
      />
    )

    expect(html).toContain("Thought for 8s")
    expect(html).toContain("reasoning-trigger")
  })

  test("renders fallback duration label when duration is omitted or 0", () => {
    const html = renderToString(
      <ReasoningCard thinking="Completed analysis." isStreaming={false} />
    )

    expect(html).toContain("Thought for a few seconds")
  })
})
