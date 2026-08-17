import { describe, expect, test } from "bun:test"
import type { AgentContext } from "../tool-ctx"
import {
  createInvoiceTool,
  createProposalTool,
  getInvoiceTool,
  getProposalTool,
  updateInvoiceTool,
  updateProposalTool,
} from "./document-drafts"
import {
  cancelScheduledDispatchTool,
  listScheduledDispatchesTool,
  scheduleDocumentSendTool,
} from "./document-schedule"

describe("Document Drafts & Scheduling Tools (Phase 3)", () => {
  const ctx: AgentContext = {
    organizationId: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-000000000002",
    userEmail: "agent-test@example.com",
    orgName: "Acme Agency",
  }

  test("getProposalTool and getInvoiceTool definitions have correct metadata and read category", () => {
    const propTool = getProposalTool(ctx)
    expect(propTool.name).toBe("get_proposal")
    expect(propTool.needsApproval).toBe(false)

    const invTool = getInvoiceTool(ctx)
    expect(invTool.name).toBe("get_invoice")
    expect(invTool.needsApproval).toBe(false)
  })

  test("createProposalTool definition has correct metadata and no approval requirement", () => {
    const tool = createProposalTool(ctx)
    expect(tool.name).toBe("create_proposal")
    expect(tool.needsApproval).toBe(false)
    expect(tool.inputSchema).toBeDefined()
    expect(tool.outputSchema).toBeDefined()
  })

  test("createInvoiceTool definition has correct metadata and no approval requirement", () => {
    const tool = createInvoiceTool(ctx)
    expect(tool.name).toBe("create_invoice")
    expect(tool.needsApproval).toBe(false)
    expect(tool.inputSchema).toBeDefined()
    expect(tool.outputSchema).toBeDefined()
  })

  test("updateProposalTool and updateInvoiceTool enforce optimistic revision locking definition", () => {
    const propTool = updateProposalTool(ctx)
    expect(propTool.name).toBe("update_proposal")
    expect(propTool.needsApproval).toBe(false)

    const invTool = updateInvoiceTool(ctx)
    expect(invTool.name).toBe("update_invoice")
    expect(invTool.needsApproval).toBe(false)
  })

  test("scheduleDocumentSendTool and cancelScheduledDispatchTool require approval", () => {
    const scheduleTool = scheduleDocumentSendTool(ctx)
    expect(scheduleTool.name).toBe("schedule_document_send")
    expect(scheduleTool.needsApproval).toBe(true)

    const cancelTool = cancelScheduledDispatchTool(ctx)
    expect(cancelTool.name).toBe("cancel_scheduled_dispatch")
    expect(cancelTool.needsApproval).toBe(true)

    const listTool = listScheduledDispatchesTool(ctx)
    expect(listTool.name).toBe("list_scheduled_dispatches")
    expect(listTool.needsApproval).toBe(false)
  })

  test("scheduleDocumentSendTool validates past dates and returns validation error", async () => {
    const tool = scheduleDocumentSendTool(ctx)
    const result = (await (tool as any).execute({
      documentType: "proposal",
      documentId: "00000000-0000-0000-0000-000000000003",
      recipientEmail: "client@example.com",
      scheduledFor: "2020-01-01T10:00:00Z", // past date
    })) as any

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe("validation")
    expect(result.error.message).toContain("must be in the future")
  })
})
