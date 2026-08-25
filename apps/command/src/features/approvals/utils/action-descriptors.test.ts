import { describe, expect, it } from "bun:test"
import {
  describeToolAction,
  formatCurrencyMinor,
  formatDateTime,
  humanizeTitle,
  safeObject,
  safeString,
} from "./action-descriptors"

describe("action-descriptors utilities", () => {
  describe("safeString", () => {
    it("returns trimmed string when valid", () => {
      expect(safeString("  hello world  ")).toBe("hello world")
    })

    it("returns fallback for empty or non-string inputs", () => {
      expect(safeString("", "fallback")).toBe("fallback")
      expect(safeString(null, "fallback")).toBe("fallback")
      expect(safeString(undefined, "fallback")).toBe("fallback")
      expect(safeString({}, "fallback")).toBe("fallback")
    })

    it("converts numbers and booleans safely", () => {
      expect(safeString(123)).toBe("123")
      expect(safeString(true)).toBe("true")
    })
  })

  describe("safeObject", () => {
    it("returns object when already an object", () => {
      expect(safeObject({ foo: "bar" })).toEqual({ foo: "bar" })
    })

    it("parses valid JSON string", () => {
      expect(safeObject('{"key": "value"}')).toEqual({ key: "value" })
    })

    it("returns empty object on invalid JSON, arrays, null, undefined", () => {
      expect(safeObject("{invalid-json}")).toEqual({})
      expect(safeObject([1, 2, 3])).toEqual({})
      expect(safeObject(null)).toEqual({})
      expect(safeObject(undefined)).toEqual({})
      expect(safeObject("plain string")).toEqual({})
    })
  })

  describe("formatCurrencyMinor", () => {
    it("formats minor units accurately into USD", () => {
      expect(formatCurrencyMinor(250000)).toBe("$2,500.00")
      expect(formatCurrencyMinor(99)).toBe("$0.99")
      expect(formatCurrencyMinor(0)).toBe("$0.00")
    })

    it("handles alternative currency codes", () => {
      expect(formatCurrencyMinor(150000, "EUR")).toMatch(/1,500.00|1.500,00/)
      expect(formatCurrencyMinor(50000, "GBP")).toMatch(/500.00/)
    })

    it("handles invalid or NaN inputs defensively", () => {
      expect(formatCurrencyMinor("invalid")).toBe("$0.00")
      expect(formatCurrencyMinor(null)).toBe("$0.00")
    })
  })

  describe("formatDateTime", () => {
    it("formats ISO string date safely", () => {
      const formatted = formatDateTime("2026-08-20T10:00:00Z")
      expect(formatted).not.toBe("N/A")
      expect(formatted).toContain("2026")
    })

    it("handles Date instances", () => {
      const d = new Date("2026-12-25T12:00:00Z")
      expect(formatDateTime(d)).toContain("2026")
    })

    it("falls back gracefully for invalid or empty inputs", () => {
      expect(formatDateTime(null)).toBe("N/A")
      expect(formatDateTime("not-a-date")).toBe("not-a-date")
    })
  })

  describe("humanizeTitle", () => {
    it("converts snake_case and camelCase to Title Case", () => {
      expect(humanizeTitle("send_proposal_email")).toBe("Send Proposal Email")
      expect(humanizeTitle("createCustomerInvoice")).toBe(
        "Create Customer Invoice"
      )
      expect(humanizeTitle("gcal_create_event")).toBe("Gcal Create Event")
    })

    it("handles empty strings", () => {
      expect(humanizeTitle("")).toBe("Unknown Action")
    })
  })

  describe("describeToolAction", () => {
    it("describes send_proposal tool with high risk", () => {
      const desc = describeToolAction("send_proposal", {
        recipientEmail: "client@example.com",
        totalMinorUnits: 500000,
        currency: "USD",
        proposalId: "prop-123",
      })

      expect(desc.displayTitle).toBe("Send Proposal")
      expect(desc.category).toBe("dispatch")
      expect(desc.riskLevel).toBe("high")
      expect(desc.keyParameters).toEqual([
        { label: "Recipient", value: "client@example.com", highlight: true },
        { label: "Total Amount", value: "$5,000.00", highlight: true },
        { label: "Document ID", value: "prop-123", badge: true },
      ])
    })

    it("describes schedule_document_send with high risk and formatted time", () => {
      const desc = describeToolAction("schedule_document_send", {
        recipientEmail: "client@example.com",
        scheduledFor: "2026-09-01T15:00:00Z",
        documentType: "proposal",
      })

      expect(desc.displayTitle).toBe("Schedule Document Dispatch")
      expect(desc.category).toBe("dispatch")
      expect(desc.riskLevel).toBe("high")
      expect(
        desc.keyParameters.some(
          (p) => p.label === "Recipient" && p.value === "client@example.com"
        )
      ).toBe(true)
      expect(
        desc.keyParameters.some((p) => p.label === "Type" && p.badge)
      ).toBe(true)
    })

    it("describes create_proposal with medium risk", () => {
      const desc = describeToolAction("create_proposal", {
        title: "Enterprise Architecture Consulting",
        customerName: "Acme Corp",
        totalMinorUnits: 2500000,
      })

      expect(desc.displayTitle).toBe("Create Proposal")
      expect(desc.category).toBe("document")
      expect(desc.riskLevel).toBe("medium")
      expect(desc.keyParameters).toEqual([
        {
          label: "Title",
          value: "Enterprise Architecture Consulting",
          highlight: true,
        },
        { label: "Client", value: "Acme Corp" },
        { label: "Total Value", value: "$25,000.00", highlight: true },
      ])
    })

    it("describes gmail_send_email with high risk", () => {
      const desc = describeToolAction("gmail_send_email", {
        to: "contact@company.com",
        subject: "Q3 Strategy Proposal Attached",
      })

      expect(desc.displayTitle).toBe("Send Email")
      expect(desc.category).toBe("email")
      expect(desc.riskLevel).toBe("high")
      expect(desc.keyParameters).toEqual([
        { label: "To", value: "contact@company.com", highlight: true },
        { label: "Subject", value: "Q3 Strategy Proposal Attached" },
      ])
    })

    it("describes gcal_create_event with calendar category", () => {
      const desc = describeToolAction("gcal_create_event", {
        summary: "Discovery Call with Acme",
        startTime: "2026-08-25T14:00:00Z",
        attendees: ["alice@example.com", "bob@example.com"],
      })

      expect(desc.displayTitle).toBe("Schedule Calendar Event")
      expect(desc.category).toBe("calendar")
      expect(desc.riskLevel).toBe("medium")
      expect(
        desc.keyParameters.some(
          (p) => p.label === "Event" && p.value === "Discovery Call with Acme"
        )
      ).toBe(true)
      expect(
        desc.keyParameters.some(
          (p) =>
            p.label === "Attendees" &&
            p.value === "alice@example.com, bob@example.com"
        )
      ).toBe(true)
    })

    it("describes update_deal_stage with crm category", () => {
      const desc = describeToolAction("update_deal_stage", {
        name: "Acme Cloud Migration",
        stage: "proposal_sent",
        valueMinorUnits: 10000000,
      })

      expect(desc.displayTitle).toBe("Update Deal Stage")
      expect(desc.category).toBe("crm")
      expect(desc.keyParameters).toEqual([
        { label: "Deal", value: "Acme Cloud Migration", highlight: true },
        { label: "Stage", value: "Proposal Sent", badge: true },
        { label: "Value", value: "$100,000.00" },
      ])
    })

    it("describes unknown / generic tools with safe fallback", () => {
      const desc = describeToolAction("custom_analytics_exporter", {
        format: "csv",
        rowCount: 500,
      })

      expect(desc.displayTitle).toBe("Custom Analytics Exporter")
      expect(desc.category).toBe("general")
      expect(desc.keyParameters).toEqual([
        { label: "Format", value: "csv" },
        { label: "Row Count", value: "500" },
      ])
    })
  })
})
