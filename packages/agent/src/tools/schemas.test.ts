import { describe, expect, it } from "bun:test"
import {
  createDealInput,
  gcalCreateEventInput,
  scheduleDocumentSendInput,
} from "./schemas"

describe("Tool Input Schemas & Normalization", () => {
  describe("gcalCreateEventInput", () => {
    it("validates and normalizes formatted ISO start dates", () => {
      const parsed = gcalCreateEventInput.parse({
        summary: "Strategy Session",
        start: "2026-09-01 10:00",
        end: "2026-09-01 11:00",
      })
      expect(parsed.summary).toBe("Strategy Session")
      expect(parsed.start).toBe("2026-09-01T10:00")
      expect(parsed.end).toBe("2026-09-01T11:00")
    })

    it("normalizes date-only start strings to default 09:00 morning time", () => {
      const parsed = gcalCreateEventInput.parse({
        title: "Kickoff Call",
        date: "2026-09-15",
      })
      expect(parsed.start).toBe("2026-09-15T09:00:00")
    })

    it("fails validation when start date is missing rather than silently defaulting to now", () => {
      const result = gcalCreateEventInput.safeParse({
        summary: "Meeting without time",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("start"))).toBe(
          true
        )
      }
    })

    it("fails validation when start date is null or invalid non-string", () => {
      const result = gcalCreateEventInput.safeParse({
        summary: "Invalid Start",
        start: null,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("scheduleDocumentSendInput", () => {
    it("parses valid schedule send payload with normalized datetime", () => {
      const parsed = scheduleDocumentSendInput.parse({
        documentType: "proposal",
        documentId: "018f3a9e-8c7e-7a1b-9f2d-3c4e5a6b7c8d",
        recipientEmail: "client@example.com",
        scheduledFor: "2026-10-01 09:30",
      })
      expect(parsed.documentType).toBe("proposal")
      expect(parsed.recipientEmail).toBe("client@example.com")
      expect(parsed.scheduledFor).toBe("2026-10-01T09:30")
    })

    it("fails validation when scheduledFor is missing or empty rather than scheduling for now", () => {
      const result = scheduleDocumentSendInput.safeParse({
        documentType: "proposal",
        documentId: "018f3a9e-8c7e-7a1b-9f2d-3c4e5a6b7c8d",
        recipientEmail: "client@example.com",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.path.includes("scheduledFor"))
        ).toBe(true)
      }
    })
  })

  describe("createDealInput UUIDv7 preservation", () => {
    it("preserves UUIDv7 companyId and contactId without dropping them", () => {
      const companyId = "018f3a9e-8c7e-7a1b-9f2d-3c4e5a6b7c8d"
      const contactId = "018f3a9e-8c7e-7a1b-9f2d-3c4e5a6b7c8e"
      const parsed = createDealInput.parse({
        title: "Enterprise Deal",
        companyId,
        contactId,
        valueMinorUnits: 5000000,
        currency: "USD",
      })
      expect(parsed.companyId).toBe(companyId)
      expect(parsed.contactId).toBe(contactId)
    })
  })
})
