import { describe, expect, it, mock } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { renderToString } from "react-dom/server"
import { ConfirmDialogProvider } from "@/components/confirm-dialog-provider"
import { CommandChatProvider } from "../../context/command-chat-context"
import { HistorySidebarProvider } from "../../hooks/use-history-sidebar"
import { HistorySidebar } from "./history-sidebar"

let mockIsMobileValue = false

mock.module("@workspace/ui/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobileValue,
}))

mock.module("@workspace/ui/components/sheet", () => ({
  Sheet: ({
    children,
    open,
  }: {
    children?: React.ReactNode
    open?: boolean
  }) =>
    open
      ? React.createElement(
          "div",
          { "data-slot": "sheet", "data-open": "true" },
          children
        )
      : null,
  SheetContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement(
      "div",
      { "data-slot": "sheet-content", ...props },
      children
    ),
  SheetHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement(
      "div",
      { "data-slot": "sheet-header", ...props },
      children
    ),
  SheetTitle: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement(
      "div",
      { "data-slot": "sheet-title", ...props },
      children
    ),
  SheetDescription: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement(
      "div",
      { "data-slot": "sheet-description", ...props },
      children
    ),
}))

mock.module("@tanstack/react-router", () => ({
  useNavigate: () => mock(() => {}),
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}))

// Mock useConversations hook
mock.module("../../hooks/use-agent-conversations", () => ({
  useConversations: () => ({
    data: {
      conversations: [
        {
          id: "conv-1",
          title: "Proposal for Acme Corp",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinned: false,
        },
        {
          id: "conv-2",
          title: "Contract Review with Wayne Enterprises",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinned: true,
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  usePinConversation: () => ({ mutate: mock(() => {}) }),
  useDeleteConversation: () => ({ mutate: mock(() => {}) }),
  useRenameConversation: () => ({ mutate: mock(() => {}) }),
}))

function renderSidebar(defaultOpen = true, defaultOpenMobile = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        ConfirmDialogProvider,
        null,
        React.createElement(
          CommandChatProvider,
          null,
          React.createElement(
            HistorySidebarProvider,
            { defaultOpen, defaultOpenMobile },
            React.createElement(HistorySidebar, null)
          )
        )
      )
    )
  )
}

describe("HistorySidebar Responsive Nested Layout & Content", () => {
  it("renders desktop aside container with accessible label and conversation titles", () => {
    mockIsMobileValue = false
    const html = renderSidebar(true, false)

    expect(html).toContain('aria-label="Conversation History"')
    expect(html).toContain("Proposal for Acme Corp")
    expect(html).toContain("Contract Review with Wayne Enterprises")
    expect(html).toContain('data-state="open"')
  })

  it("renders collapsed desktop aside with data-state closed when defaultOpen is false", () => {
    mockIsMobileValue = false
    const html = renderSidebar(false, false)

    expect(html).toContain('aria-label="Conversation History"')
    expect(html).toContain('data-state="closed"')
  })

  it("defaults to closed mobile drawer on mobile viewport without auto-opening", () => {
    mockIsMobileValue = true
    const html = renderSidebar(true, false)

    expect(html).not.toContain("Proposal for Acme Corp")
  })

  it("renders mobile Sheet drawer when viewport is mobile and openMobile is true", () => {
    mockIsMobileValue = true
    const html = renderSidebar(true, true)

    expect(html).toContain('data-slot="sheet"')
    expect(html).toContain("Proposal for Acme Corp")
    expect(html).toContain("Contract Review with Wayne Enterprises")
  })
})
