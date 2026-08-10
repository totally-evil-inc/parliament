import { describe, expect, it } from "bun:test"
import {
  createCustomerServerFn,
  getCustomerAnalyticsServerFn,
  getCustomerDetailsServerFn,
  listCustomersServerFn,
  updateCustomerServerFn,
} from "./customers"

describe("Customer Server Functions Exports", () => {
  it("exports all customer server functions cleanly", () => {
    expect(listCustomersServerFn).toBeDefined()
    expect(getCustomerDetailsServerFn).toBeDefined()
    expect(getCustomerAnalyticsServerFn).toBeDefined()
    expect(createCustomerServerFn).toBeDefined()
    expect(updateCustomerServerFn).toBeDefined()
  })
})
