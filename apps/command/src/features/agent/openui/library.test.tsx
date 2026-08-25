import { describe, expect, test } from "bun:test"
import type React from "react"
import { renderToString } from "react-dom/server"
import { DataTableComponent } from "./library"

describe("DataTableComponent (OpenUI)", () => {
  test("renders data table inside ScrollArea with horizontal orientation and data slots", () => {
    const Component = (
      DataTableComponent as unknown as {
        component: (arg: {
          props: {
            columns: Array<{ key: string; header: string }>
            data: Array<Record<string, unknown>>
          }
        }) => React.ReactElement
      }
    ).component
    const columns = [
      { key: "title", header: "TITLE" },
      { key: "status", header: "STATUS" },
      { key: "value", header: "VALUE" },
    ]
    const data = [
      {
        title: "Enterprise Strategy Proposal",
        status: "sent",
        value: "$85,000",
      },
    ]

    const element = Component({ props: { columns, data } })
    const html = renderToString(element)

    expect(html).toContain('data-slot="scroll-area"')
    expect(html).toContain('data-slot="scroll-area-viewport"')
    expect(html).toContain("<table")
    expect(html).toContain("Enterprise Strategy Proposal")
    expect(html).toContain("$85,000")
    expect(html).not.toContain('class="overflow-x-auto')
  })
})
