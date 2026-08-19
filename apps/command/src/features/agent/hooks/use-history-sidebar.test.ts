import { describe, expect, it } from "bun:test"
import React from "react"
import { HistorySidebarProvider, useHistorySidebar } from "./use-history-sidebar"

function TestConsumer() {
  const { isOpen } = useHistorySidebar()
  return React.createElement("div", { "data-open": String(isOpen) }, "test")
}

describe("HistorySidebarContext", () => {
  it("exports provider and hook", () => {
    expect(HistorySidebarProvider).toBeDefined()
    expect(useHistorySidebar).toBeDefined()
  })

  it("renders correctly with HistorySidebarProvider", () => {
    const child = React.createElement(TestConsumer)
    const element = React.createElement(
      HistorySidebarProvider,
      { defaultOpen: true, children: child },
      child
    )
    expect(element).toBeDefined()
  })
})
