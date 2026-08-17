import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtImage,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "./chain-of-thought"

describe("ChainOfThought", () => {
  test("renders header, steps, search results, and image correctly", () => {
    const html = renderToString(
      <ChainOfThought defaultOpen={true}>
        <ChainOfThoughtHeader>AI Reasoning Chain</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <ChainOfThoughtStep
            label="Searching customer records"
            description="Queried CRM for Acme Corp history"
            status="complete"
          >
            <ChainOfThoughtSearchResults>
              <ChainOfThoughtSearchResult>
                acme-corp.com
              </ChainOfThoughtSearchResult>
              <ChainOfThoughtSearchResult>
                crm-deals/2026
              </ChainOfThoughtSearchResult>
            </ChainOfThoughtSearchResults>
          </ChainOfThoughtStep>

          <ChainOfThoughtStep
            label="Generating proposal mockup"
            status="active"
            isLast={true}
          >
            <ChainOfThoughtImage
              src="https://example.com/mockup.png"
              caption="Proposed layout preview"
            />
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>
    )

    expect(html).toContain("AI Reasoning Chain")
    expect(html).toContain("Searching customer records")
    expect(html).toContain("Queried CRM for Acme Corp history")
    expect(html).toContain("acme-corp.com")
    expect(html).toContain("crm-deals/2026")
    expect(html).toContain("Generating proposal mockup")
    expect(html).toContain("Proposed layout preview")
  })
})
