import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { Shimmer } from "./shimmer"

describe("Shimmer", () => {
  test("renders text content with shimmer attributes", () => {
    const html = renderToString(<Shimmer>Thinking about the proposal...</Shimmer>)
    expect(html).toContain("Thinking about the proposal...")
    expect(html).toContain('data-slot="shimmer"')
    expect(html).toContain("animate-text-shimmer")
  })

  test("renders with custom polymorphic element", () => {
    const html = renderToString(
      <Shimmer as="span" duration={1.5} spread={3} className="custom-shimmer">
        Fast Shimmer
      </Shimmer>
    )
    expect(html).toContain("<span")
    expect(html).toContain("Fast Shimmer")
    expect(html).toContain("custom-shimmer")
    expect(html).toContain("--shimmer-duration:1.5s")
  })
})
