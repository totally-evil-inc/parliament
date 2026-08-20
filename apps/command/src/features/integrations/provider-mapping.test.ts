import { describe, expect, it } from "bun:test"
import { isIntegrationConnected } from "./provider-mapping"

describe("provider-mapping: isIntegrationConnected", () => {
  it("returns false for null, undefined, or empty accounts", () => {
    expect(isIntegrationConnected(null, "gmail")).toBe(false)
    expect(isIntegrationConnected(undefined, "gmail")).toBe(false)
    expect(isIntegrationConnected([], "gmail")).toBe(false)
    expect(isIntegrationConnected(null, "")).toBe(false)
  })

  it("handles exact provider match correctly", () => {
    const accounts = [{ providerId: "gmail" }, { providerId: "cal" }]
    expect(isIntegrationConnected(accounts, "gmail")).toBe(true)
    expect(isIntegrationConnected(accounts, "cal")).toBe(true)
    expect(isIntegrationConnected(accounts, "google-calendar")).toBe(false)
    expect(isIntegrationConnected(accounts, "github")).toBe(false)
  })

  it("resolves Google fallback correctly for gmail, calendar, and drive", () => {
    const accounts = [{ providerId: "google" }]
    expect(isIntegrationConnected(accounts, "google")).toBe(true)
    expect(isIntegrationConnected(accounts, "gmail")).toBe(true)
    expect(isIntegrationConnected(accounts, "google-calendar")).toBe(true)
    expect(isIntegrationConnected(accounts, "google-drive")).toBe(true)
    // Non-Google provider should not match
    expect(isIntegrationConnected(accounts, "cal")).toBe(false)
    expect(isIntegrationConnected(accounts, "github")).toBe(false)
  })
})
