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
