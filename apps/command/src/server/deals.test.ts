import { describe, expect, it } from "bun:test"
import {
  convertDealToProposalServerFn,
  createDealServerFn,
  getDealAnalyticsServerFn,
  listDealsServerFn,
  updateDealStageServerFn,
} from "./deals"

describe("Deal Server Functions Exports", () => {
  it("exports all deal server functions cleanly", () => {
    expect(listDealsServerFn).toBeDefined()
    expect(getDealAnalyticsServerFn).toBeDefined()
    expect(createDealServerFn).toBeDefined()
    expect(updateDealStageServerFn).toBeDefined()
    expect(convertDealToProposalServerFn).toBeDefined()
  })
})
