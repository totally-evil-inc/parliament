import { describe, expect, it } from "bun:test"
import { TOOL_CATALOG, TOOL_NAMES, toolSpecs } from "./catalog"
import {
  createInvoiceInput,
  createProposalInput,
  scheduleDocumentSendInput,
  updateInvoiceInput,
  updateProposalInput,
} from "./schemas"

describe("Agent Tool Catalog & Schemas", () => {
  it("includes all canonical document and scheduling tools", () => {
    const requiredTools = [
      "create_proposal",
      "create_invoice",
      "get_proposal",
      "get_invoice",
      "update_proposal",
      "update_invoice",
      "send_proposal",
      "send_invoice",
      "schedule_document_send",
      "list_scheduled_dispatches",
      "cancel_scheduled_dispatch",
    ]

    for (const toolName of requiredTools) {
      expect(TOOL_NAMES).toContain(toolName as any)
      expect(TOOL_CATALOG[toolName as keyof typeof TOOL_CATALOG]).toBeDefined()
    }
  })

  it("enforces correct needsApproval flags", () => {
    // Authoring tools do not need manual approval
    expect(TOOL_CATALOG.create_proposal.needsApproval).toBe(false)
    expect(TOOL_CATALOG.create_invoice.needsApproval).toBe(false)
    expect(TOOL_CATALOG.update_proposal.needsApproval).toBe(false)
    expect(TOOL_CATALOG.update_invoice.needsApproval).toBe(false)

    // Read tools do not need approval
    expect(TOOL_CATALOG.get_proposal.needsApproval).toBe(false)
    expect(TOOL_CATALOG.get_invoice.needsApproval).toBe(false)
    expect(TOOL_CATALOG.list_scheduled_dispatches.needsApproval).toBe(false)

    // Dispatch and destructive tools MUST require human approval
    expect(TOOL_CATALOG.send_proposal.needsApproval).toBe(true)
    expect(TOOL_CATALOG.send_invoice.needsApproval).toBe(true)
    expect(TOOL_CATALOG.schedule_document_send.needsApproval).toBe(true)
    expect(TOOL_CATALOG.cancel_scheduled_dispatch.needsApproval).toBe(true)
  })

  it("validates create_proposal input with rich declarative blocks", () => {
    const validProposal = {
      title: "Enterprise Replatforming",
      customerName: "Acme Corp",
      customerEmail: "acme@example.com",
      currency: "USD",
      validDays: 14,
      items: [
        {
          description: "Cloud Architecture Migration",
          unitPriceMinor: 2500000,
          quantity: "1",
          details: "Zero-downtime migration",
        },
      ],
      discount: {
        kind: "rate" as const,
        basisPoints: 1000,
      },
      tax: {
        kind: "rate" as const,
        basisPoints: 1600,
      },
      blocks: [
        {
          type: "section" as const,
          title: "Executive Summary",
          content:
            "Migrate legacy infrastructure to modern Kubernetes architecture.",
        },
        {
          type: "metrics" as const,
          items: [
            {
              value: "99.99%",
              label: "Target Availability",
              detail: "Multi-region failover",
            },
          ],
        },
        {
          type: "timeline" as const,
          items: [
            {
              date: "Month 1",
              title: "Assessment",
              description: "Audit dependencies",
            },
          ],
        },
        {
          type: "team" as const,
          items: [{ name: "Alex Morgan", role: "Principal Architect" }],
        },
        {
          type: "testimonials" as const,
          items: [
            {
              quote: "Transformative results",
              author: "Jane Doe",
              role: "CTO",
            },
          ],
        },
        {
          type: "faq" as const,
          items: [
            {
              question: "Is migration zero-downtime?",
              answer: "Yes, via shadow routing.",
            },
          ],
        },
        {
          type: "signature" as const,
          title: "Acceptance & Terms",
        },
      ],
    }

    const parsed = createProposalInput.safeParse(validProposal)
    expect(parsed.success).toBe(true)
  })

  it("validates create_invoice input with integer minor pricing", () => {
    const validInvoice = {
      title: "Invoice #1042",
      customerName: "Acme Corp",
      currency: "USD",
      dueDays: 14,
      paymentTerms: "Net 14 days",
      items: [
        {
          description: "Milestone 1 Deliverables",
          unitPriceMinor: 750000,
          quantity: "1",
        },
      ],
    }

    const parsed = createInvoiceInput.safeParse(validInvoice)
    expect(parsed.success).toBe(true)
  })

  it("validates update_proposal and update_invoice with expectedRevision optimistic locking", () => {
    const parsedPropUpdate = updateProposalInput.safeParse({
      id: crypto.randomUUID(),
      expectedRevision: 3,
      title: "Updated Title",
    })
    expect(parsedPropUpdate.success).toBe(true)

    const parsedInvUpdate = updateInvoiceInput.safeParse({
      id: crypto.randomUUID(),
      expectedRevision: 1,
      paymentTerms: "Due immediately",
    })
    expect(parsedInvUpdate.success).toBe(true)
  })

  it("validates schedule_document_send input with future timestamp and recipient", () => {
    const validSchedule = {
      documentType: "proposal" as const,
      documentId: crypto.randomUUID(),
      recipientEmail: "client@acme.com",
      scheduledFor: "2026-09-01T09:00:00Z",
      subject: "Your Project Proposal",
      personalMessage: "Looking forward to partnering with your team!",
    }

    const parsed = scheduleDocumentSendInput.safeParse(validSchedule)
    expect(parsed.success).toBe(true)
  })

  it("exports toolSpecs matching TOOL_CATALOG", () => {
    const specs = toolSpecs()
    expect(specs.length).toBe(TOOL_NAMES.length)
    for (const spec of specs) {
      expect(spec.name).toBeDefined()
      expect(spec.description).toBeDefined()
      expect(spec.inputSchema).toBeDefined()
    }
  })
})
