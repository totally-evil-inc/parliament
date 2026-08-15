import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning"

describe("Reasoning", () => {
  test("renders trigger and content with duration", () => {
    const html = renderToString(
      <Reasoning defaultOpen={true} duration={4}>
        <ReasoningTrigger />
        <ReasoningContent>
          Analyzing deal terms and client history
        </ReasoningContent>
      </Reasoning>
    )

    expect(html).toContain("Thought for 4s")
    expect(html).toContain("Analyzing deal terms and client history")
    expect(html).toContain('data-slot="reasoning-trigger"')
    expect(html).toContain('data-slot="reasoning-content"')
  })

  test("renders streaming state with shimmer trigger", () => {
    const html = renderToString(
      <Reasoning isStreaming={true}>
        <ReasoningTrigger />
        <ReasoningContent>Streaming thoughts...</ReasoningContent>
      </Reasoning>
    )

    expect(html).toContain("Thinking…")
    expect(html).toContain("Streaming thoughts...")
  })

  test("supports custom getThinkingMessage formatter", () => {
    const html = renderToString(
      <Reasoning duration={10}>
        <ReasoningTrigger
          getThinkingMessage={(isStreaming, duration) =>
            isStreaming ? "Synthesizing..." : `Completed in ${duration}s`
          }
        />
        <ReasoningContent>Step 1 done</ReasoningContent>
      </Reasoning>
    )

    expect(html).toContain("Completed in 10s")
  })
})
