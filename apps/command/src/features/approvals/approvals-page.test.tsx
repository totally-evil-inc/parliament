import { describe, expect, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderToString } from "react-dom/server"
import { HeaderProvider } from "@/layouts/header-portal"
import { ApprovalsPage } from "./approvals-page"

describe("ApprovalsPage Component", () => {
  test("renders page header and caught up empty state when no pending actions", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Prepopulate query cache with empty array
    queryClient.setQueryData(["agent-approvals", "pending"], [])

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <HeaderProvider>
          <ApprovalsPage />
        </HeaderProvider>
      </QueryClientProvider>
    )

    expect(html).toContain("Agent Action Approvals")
    expect(html).toContain("All Caught Up")
    expect(html).toContain("No pending actions requiring Human-in-the-Loop")
  })

  test("renders decision cards for pending actions in query cache", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    queryClient.setQueryData(
      ["agent-approvals", "pending"],
      [
        {
          id: "action-100",
          organizationId: "org-1",
          conversationId: "conv-1",
          messageId: "msg-1",
          toolName: "send_proposal",
          toolArgs: {
            recipientEmail: "lead@enterprise.com",
            totalMinorUnits: 2500000,
            currency: "USD",
          },
          summary: "Send enterprise consulting proposal to client",
          status: "pending",
          resolvedByUserId: null,
          resolutionFeedback: null,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
    )

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <HeaderProvider>
          <ApprovalsPage />
        </HeaderProvider>
      </QueryClientProvider>
    )

    expect(html).toContain("Send Proposal")
    expect(html).toContain("lead@enterprise.com")
    expect(html).toContain("$25,000.00")
    expect(html).toContain("Approve Action")
    expect(html).toContain("Reject")
  })
})
