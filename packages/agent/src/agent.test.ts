import { describe, expect, test } from "bun:test"
import { messagePartJson, parseMessageParts } from "../src/chat/message-parts"
import {
  TOOL_CATALOG,
  TOOL_NAMES,
  type ToolEntry,
  type ToolName,
} from "../src/tools/catalog"
import { toolInputSchemas, toolOutputSchemas } from "../src/tools/schemas"

const APPROVAL_TOOLS: ToolName[] = [
  "create_deal",
  "update_deal_stage",
  "create_customer",
  "update_customer",
  "send_proposal",
  "send_invoice",
  "schedule_document_send",
  "cancel_scheduled_dispatch",
  "gmail_send_email",
  "gcal_create_event",
  "gcal_cancel_event",
]

const MUTATING_TOOLS: ToolName[] = [
  ...APPROVAL_TOOLS,
  "gmail_create_draft",
  "create_proposal",
  "create_invoice",
  "update_proposal",
  "update_invoice",
]

describe("tool registry invariants", () => {
  test("every catalog tool has schemas registered", () => {
    for (const name of TOOL_NAMES) {
      expect(toolInputSchemas[name], `${name} input`).toBeDefined()
      expect(toolOutputSchemas[name], `${name} output`).toBeDefined()
    }
  })

  test("tool names are snake_case", () => {
    for (const name of TOOL_NAMES) {
      expect(name, "snake_case").toMatch(/^[a-z][a-z0-9]+(_[a-z0-9]+)*$/)
    }
  })

  test("approval flags match the §6 policy matrix", () => {
    for (const name of TOOL_NAMES) {
      const entry: ToolEntry = TOOL_CATALOG[name]
      expect(entry.needsApproval, name).toBe(APPROVAL_TOOLS.includes(name))
    }
    for (const name of MUTATING_TOOLS) {
      expect(TOOL_CATALOG[name].category, name).toBe("mutate")
    }
  })

  test("integration tools declare their provider", () => {
    const gmail: ToolEntry = TOOL_CATALOG.gmail_send_email
    const calendar: ToolEntry = TOOL_CATALOG.gcal_create_event
    const plain: ToolEntry = TOOL_CATALOG.list_deals
    expect(gmail.integration).toBe("gmail")
    expect(calendar.integration).toBe("google-calendar")
    expect(plain.integration).toBeUndefined()
  })

  test("integration-backed mutating tools are approval-gated (draft is the one auto-run exception)", () => {
    for (const name of TOOL_NAMES) {
      const entry: ToolEntry = TOOL_CATALOG[name]
      if (
        entry.category === "mutate" &&
        (entry.integration === "gmail" ||
          entry.integration === "google-calendar")
      ) {
        if (name === "gmail_create_draft") {
          expect(entry.needsApproval, "gmail_create_draft auto-runs").toBe(
            false
          )
        } else {
          expect(entry.needsApproval, `${name} approval`).toBe(true)
        }
      }
    }
  })
})

describe("input schema round-trips", () => {
  test("create_deal accepts documented optional fields", () => {
    const parsed = toolInputSchemas.create_deal.parse({
      title: "Acme onboarding",
      stage: "proposal_sent",
      valueMinorUnits: 12_000_000,
      currency: "KES",
      expectedCloseDate: "2026-09-30",
    })
    expect(parsed.currency).toBe("KES")
  })

  test("send_proposal requires a draft id", () => {
    expect(() => toolInputSchemas.send_proposal.parse({})).toThrow()
    const ok = toolInputSchemas.send_proposal.parse({
      documentId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    })
    expect(ok.documentId).toHaveLength(36)
  })

  test("gcal_list_events bounds days to 1..14", () => {
    expect(() =>
      toolInputSchemas.gcal_list_events.parse({ days: 30 })
    ).toThrow()
    expect(toolInputSchemas.gcal_list_events.parse({ days: 14 }).days).toBe(14)
  })
})

describe("message parts", () => {
  test("text/thinking/tool parts round-trip", () => {
    const parts = [
      { type: "text", text: "hi" },
      { type: "thinking", thinking: "plan..." },
      {
        type: "tool-call",
        toolCallId: "c1",
        toolName: "list_deals",
        args: {},
      },
      {
        type: "tool-result",
        toolCallId: "c1",
        toolName: "list_deals",
        result: { rows: [] },
      },
      {
        type: "approval-requested",
        toolName: "send_proposal",
        args: { documentId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" },
        resumeId: "r1",
      },
    ] as const
    expect(messagePartJson.parse(parts[0]).type).toBe("text")
    expect(parseMessageParts(parts).length).toBe(parts.length)
  })

  test("unknown parts are preserved opaquely", () => {
    const parts = parseMessageParts([
      { type: "future-part", data: 1 },
      { type: "text", text: "ok" },
    ])
    expect(parts.length).toBe(2)
    expect(parts[0]).toMatchObject({ type: "future-part" })
  })

  test("non-array input yields empty", () => {
    expect(parseMessageParts(null)).toEqual([])
    expect(parseMessageParts({})).toEqual([])
  })
})
