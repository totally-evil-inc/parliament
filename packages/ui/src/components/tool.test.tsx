import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import {
  getStatusBadge,
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./tool"

describe("Tool", () => {
  test("getStatusBadge returns appropriate badges for all states", () => {
    const runningHtml = renderToString(
      getStatusBadge("input-available") as React.ReactElement
    )
    const approvalHtml = renderToString(
      getStatusBadge("approval-requested") as React.ReactElement
    )
    const completed = getStatusBadge("output-available")
    const errorHtml = renderToString(
      getStatusBadge("output-error") as React.ReactElement
    )
    const deniedHtml = renderToString(
      getStatusBadge("output-denied") as React.ReactElement
    )

    expect(runningHtml).toContain("Running")
    expect(approvalHtml).toContain("Awaiting Approval")
    expect(completed).toBeNull() // Completed state is unbadged for minimalism
    expect(errorHtml).toContain("Error")
    expect(deniedHtml).toContain("Denied")
  })

  test("renders collapsible Tool with input parameters and result output", () => {
    const html = renderToString(
      <Tool defaultOpen={true}>
        <ToolHeader
          type="list_deals"
          state="output-available"
          title="Reviewing deals"
        />
        <ToolContent>
          <ToolInput input={{ stage: "negotiation", limit: 5 }} />
          <ToolOutput
            output={{ count: 3, items: ["Deal A", "Deal B", "Deal C"] }}
          />
        </ToolContent>
      </Tool>
    )

    expect(html).toContain("Reviewing deals")
    expect(html).not.toContain("Completed")
    expect(html).toContain("Parameters")
    expect(html).toContain("negotiation")
    expect(html).toContain("Result")
    expect(html).toContain("Deal A")
    expect(html).toContain('data-slot="tool-header"')
    expect(html).toContain('data-slot="tool-content"')
  })

  test("renders error output cleanly", () => {
    const html = renderToString(
      <Tool defaultOpen={true}>
        <ToolHeader
          type="gmail_send_email"
          state="output-error"
          title="Dispatching email"
        />
        <ToolContent>
          <ToolOutput errorText="SMTP authorization expired" />
        </ToolContent>
      </Tool>
    )

    expect(html).toContain("Dispatching email")
    expect(html).toContain("Error")
    expect(html).toContain("Error Output")
    expect(html).toContain("SMTP authorization expired")
  })
})
