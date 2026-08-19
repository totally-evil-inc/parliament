import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { ApprovalDecisionCard } from "./approval-decision-card"

describe("ApprovalDecisionCard Component", () => {
  test("renders pending decision with high-risk badge and structured parameters", () => {
    const html = renderToString(
      <ApprovalDecisionCard
        approvalId="appr-12345"
        toolName="send_proposal"
        args={{
          recipientEmail: "client@enterprise.com",
          totalMinorUnits: 1500000,
          currency: "USD",
          proposalId: "prop-888",
        }}
        confidenceScore={0.95}
      />
    )

    expect(html).toContain("Send Proposal")
    expect(html).toContain("High Risk")
    expect(html).toContain("send_proposal")
    expect(html).toContain("client@enterprise.com")
    expect(html).toContain("$15,000.00")
    expect(html).toContain("95% Confidence")
    expect(html).toContain("Approve Action")
    expect(html).toContain("Reject")
  })

  test("renders approved compact status state", () => {
    const html = renderToString(
      <ApprovalDecisionCard
        approvalId="appr-12345"
        toolName="send_proposal"
        args={{ recipientEmail: "client@enterprise.com" }}
        status="approved"
      />
    )

    expect(html).toContain("Send Proposal Authorized")
    expect(html).toContain("Approved")
    expect(html).not.toContain("Approve Action")
  })

  test("renders rejected compact status state", () => {
    const html = renderToString(
      <ApprovalDecisionCard
        approvalId="appr-12345"
        toolName="send_proposal"
        args={{ recipientEmail: "client@enterprise.com" }}
        status="rejected"
      />
    )

    expect(html).toContain("Send Proposal Denied")
    expect(html).toContain("Rejected")
    expect(html).not.toContain("Approve Action")
  })

  test("renders expired status state", () => {
    const html = renderToString(
      <ApprovalDecisionCard
        approvalId="appr-12345"
        toolName="schedule_document_send"
        args={{ recipientEmail: "client@enterprise.com" }}
        status="expired"
      />
    )

    expect(html).toContain("Schedule Document Dispatch Request Expired")
    expect(html).toContain("Expired")
  })

  test("renders error banner when status is error or errorText is provided", () => {
    const html = renderToString(
      <ApprovalDecisionCard
        approvalId="appr-12345"
        toolName="create_invoice"
        args={{ title: "Q3 Bill" }}
        status="error"
        errorText="Stripe account authorization rejected"
      />
    )

    expect(html).toContain("Stripe account authorization rejected")
  })

  test("renders raw audit payload in collapsible content", () => {
    const html = renderToString(
      <ApprovalDecisionCard
        approvalId="appr-12345678"
        toolName="custom_tool"
        args={{ key1: "value1", nested: { num: 42 } }}
        defaultAuditOpen={true}
      />
    )

    expect(html).toContain("Audit Payload &amp; Raw Arguments")
    expect(html).toContain("appr-123")
    expect(html).toContain("&quot;key1&quot;: &quot;value1&quot;")
  })
})
