import { describe, expect, it } from "bun:test"
import {
  cancelScheduleInputSchema,
  cancelScheduledDispatch,
  getScheduledDispatchForDocument,
  listScheduledDispatches,
  scheduleDispatchInputSchema,
  scheduleDocumentDispatch,
  sendNowInputSchema,
  sendScheduledDispatchNow,
  updateScheduleInputSchema,
  updateScheduledDispatch,
} from "./scheduled-dispatches"

describe("Scheduled Dispatches Server & Schema Validation", () => {
  it("exports all server functions cleanly", () => {
    expect(scheduleDocumentDispatch).toBeDefined()
    expect(getScheduledDispatchForDocument).toBeDefined()
    expect(listScheduledDispatches).toBeDefined()
    expect(updateScheduledDispatch).toBeDefined()
    expect(cancelScheduledDispatch).toBeDefined()
    expect(sendScheduledDispatchNow).toBeDefined()
  })

  describe("scheduleDispatchInputSchema", () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    const validPayload = {
      documentType: "proposal" as const,
      documentId: "00000000-0000-7000-8000-000000000001",
      documentTitle: "Enterprise Scope of Work",
      recipientEmail: "client@example.com",
      ccRecipients: ["accounting@example.com"],
      bccRecipients: [],
      subject: "Your Proposal",
      message: "Please review the proposal attached.",
      scheduledFor: futureDate,
      sendMethod: "gmail" as const,
    }

    it("accepts a valid dispatch payload", () => {
      const result = scheduleDispatchInputSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it("rejects invalid or missing recipient email", () => {
      const result = scheduleDispatchInputSchema.safeParse({
        ...validPayload,
        recipientEmail: "not-an-email",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("recipient email")
      }
    })

    it("rejects empty recipient email", () => {
      const result = scheduleDispatchInputSchema.safeParse({
        ...validPayload,
        recipientEmail: "",
      })
      expect(result.success).toBe(false)
    })

    it("rejects past scheduled timestamp", () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString()
      const result = scheduleDispatchInputSchema.safeParse({
        ...validPayload,
        scheduledFor: pastDate,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must be in the future")
      }
    })

    it("rejects non-uuid documentId", () => {
      const result = scheduleDispatchInputSchema.safeParse({
        ...validPayload,
        documentId: "invalid-id",
      })
      expect(result.success).toBe(false)
    })

    it("rejects empty subject", () => {
      const result = scheduleDispatchInputSchema.safeParse({
        ...validPayload,
        subject: "   ",
      })
      expect(result.success).toBe(false)
    })

    it("rejects empty message note", () => {
      const result = scheduleDispatchInputSchema.safeParse({
        ...validPayload,
        message: "   ",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("updateScheduleInputSchema", () => {
    it("validates update fields correctly", () => {
      const futureDate = new Date(Date.now() + 172800000).toISOString()
      const result = updateScheduleInputSchema.safeParse({
        id: "00000000-0000-7000-8000-000000000001",
        recipientEmail: "updated@example.com",
        scheduledFor: futureDate,
      })
      expect(result.success).toBe(true)
    })

    it("rejects past date in update payload", () => {
      const pastDate = new Date(Date.now() - 10000).toISOString()
      const result = updateScheduleInputSchema.safeParse({
        id: "00000000-0000-7000-8000-000000000001",
        scheduledFor: pastDate,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("cancelScheduleInputSchema & sendNowInputSchema", () => {
    it("accepts valid cancel identifiers", () => {
      expect(
        cancelScheduleInputSchema.safeParse({
          id: "00000000-0000-7000-8000-000000000001",
        }).success
      ).toBe(true)

      expect(
        cancelScheduleInputSchema.safeParse({
          documentId: "00000000-0000-7000-8000-000000000001",
          documentType: "proposal",
        }).success
      ).toBe(true)
    })

    it("validates send now payload", () => {
      expect(
        sendNowInputSchema.safeParse({
          id: "00000000-0000-7000-8000-000000000001",
        }).success
      ).toBe(true)
      expect(sendNowInputSchema.safeParse({ id: "not-uuid" }).success).toBe(
        false
      )
    })
  })
})
