import { describe, expect, it } from "bun:test"
import React from "react"
import { renderToString } from "react-dom/server"
import {
  HistorySidebarProvider,
  useHistorySidebar,
} from "./use-history-sidebar"

function TestConsumer() {
  const { isOpen, isMobile, openMobile } = useHistorySidebar()
  return React.createElement(
    "div",
    {
      "data-open": String(isOpen),
      "data-mobile": String(isMobile),
      "data-open-mobile": String(openMobile),
    },
    "test"
  )
}

describe("HistorySidebarContext", () => {
  it("exports provider and hook", () => {
    expect(HistorySidebarProvider).toBeDefined()
    expect(useHistorySidebar).toBeDefined()
  })

  it("throws descriptive error when useHistorySidebar is used outside Provider", () => {
    expect(() => {
      renderToString(React.createElement(TestConsumer))
    }).toThrow("useHistorySidebar must be used within a HistorySidebarProvider")
  })

  it("renders correctly with HistorySidebarProvider defaultOpen=true", () => {
    const child = React.createElement(TestConsumer)
    const element = React.createElement(
      HistorySidebarProvider,
      { defaultOpen: true },
      child
    )
    const html = renderToString(element)
    expect(html).toContain('data-open="true"')
  })

  it("renders correctly with HistorySidebarProvider defaultOpen=false", () => {
    const child = React.createElement(TestConsumer)
    const element = React.createElement(
      HistorySidebarProvider,
      { defaultOpen: false },
      child
    )
    const html = renderToString(element)
    expect(html).toContain('data-open="false"')
  })

  it("initializes defaultOpenMobile correctly", () => {
    const child = React.createElement(TestConsumer)
    const element = React.createElement(
      HistorySidebarProvider,
      { defaultOpen: true, defaultOpenMobile: true },
      child
    )
    const html = renderToString(element)
    expect(html).toContain('data-open-mobile="true"')
  })
})
