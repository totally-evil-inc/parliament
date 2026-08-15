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
    const pendingHtml = renderToString(<>{getStatusBadge("input-streaming")}</>)
    const runningHtml = renderToString(<>{getStatusBadge("input-available")}</>)
    const approvalHtml = renderToString(
      <>{getStatusBadge("approval-requested")}</>
    )
    const respondedHtml = renderToString(
      <>{getStatusBadge("approval-responded")}</>
    )
    const completedHtml = renderToString(
      <>{getStatusBadge("output-available")}</>
    )
    const errorHtml = renderToString(<>{getStatusBadge("output-error")}</>)
    const deniedHtml = renderToString(<>{getStatusBadge("output-denied")}</>)

    expect(pendingHtml).toContain("Pending")
    expect(runningHtml).toContain("Running")
    expect(approvalHtml).toContain("Awaiting Approval")
    expect(respondedHtml).toContain("Approved")
    expect(completedHtml).toContain("Completed")
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
    expect(html).toContain("Completed")
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
