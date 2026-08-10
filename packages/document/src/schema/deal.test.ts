import { describe, expect, it } from "bun:test"
import {
  createDealInputSchema,
  dealSchema,
  dealStageEnumSchema,
  updateDealStageInputSchema,
} from "./deal"

describe("Deal Domain Models & Schemas", () => {
  it("validates deal stage enum values", () => {
    expect(dealStageEnumSchema.parse("lead")).toBe("lead")
    expect(dealStageEnumSchema.parse("proposal_sent")).toBe("proposal_sent")
    expect(dealStageEnumSchema.parse("closed_won")).toBe("closed_won")
    expect(() => dealStageEnumSchema.parse("invalid_stage")).toThrow()
  })

  it("validates full Deal entity with minor unit integer value", () => {
    const validDeal = {
      id: "019fecc1-a5fb-7cd8-93f8-4b3f218f6d91",
      organizationId: "019fecc1-a4fd-7086-b102-f7f5d78e9f82",
      title: "Enterprise Web Redesign",
      stage: "proposal_sent",
      valueMinorUnits: 1500000, // $15,000.00 in cents
      currency: "USD",
      createdAt: "2026-08-10T12:00:00.000Z",
      updatedAt: "2026-08-10T12:00:00.000Z",
    }
    expect(dealSchema.parse(validDeal)).toEqual(validDeal)
  })

  it("rejects non-integer monetary values", () => {
    const invalidDeal = {
      id: "019fecc1-a5fb-7cd8-93f8-4b3f218f6d91",
      organizationId: "019fecc1-a4fd-7086-b102-f7f5d78e9f82",
      title: "Invalid Float Deal",
      stage: "lead",
      valueMinorUnits: 15000.5, // Float prohibited
      currency: "USD",
      createdAt: "2026-08-10T12:00:00.000Z",
      updatedAt: "2026-08-10T12:00:00.000Z",
    }
    expect(() => dealSchema.parse(invalidDeal)).toThrow()
  })

  it("parses CreateDealInput with default stage and minor units", () => {
    const input = createDealInputSchema.parse({
      title: "Inbound Lead",
    })
    expect(input.stage).toBe("lead")
    expect(input.valueMinorUnits).toBe(0)
    expect(input.currency).toBe("USD")
  })

  it("parses UpdateDealStageInput", () => {
    const update = updateDealStageInputSchema.parse({
      id: "deal-123",
      stage: "closed_won",
    })
    expect(update.stage).toBe("closed_won")
  })
})
