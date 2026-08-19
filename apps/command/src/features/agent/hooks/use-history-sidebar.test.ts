import { describe, expect, it } from "bun:test"
import React from "react"
import { HistorySidebarProvider, useHistorySidebar } from "./use-history-sidebar"

function TestConsumer() {
  const { isOpen, toggle } = useHistorySidebar()
  return React.createElement("div", { "data-open": String(isOpen) }, "test")
}

describe("HistorySidebarContext", () => {
  it("exports provider and hook", () => {
    expect(HistorySidebarProvider).toBeDefined()
    expect(useHistorySidebar).toBeDefined()
  })

  it("renders correctly with HistorySidebarProvider", () => {
    const element = React.createElement(
      HistorySidebarProvider,
      { defaultOpen: true },
      React.createElement(TestConsumer)
    )
    expect(element).toBeDefined()
  })
})
