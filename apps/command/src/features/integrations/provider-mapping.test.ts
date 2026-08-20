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

  it("does NOT treat a base google social login account as connected for specific service capabilities", () => {
    // A base 'google' login account only grants userinfo.email and userinfo.profile scopes.
    // Dedicated capabilities like gmail, google-calendar, and google-drive require their own linked Generic OAuth account.
    const googleLoginAccounts = [{ providerId: "google" }]
    expect(isIntegrationConnected(googleLoginAccounts, "google")).toBe(true)
    expect(isIntegrationConnected(googleLoginAccounts, "gmail")).toBe(false)
    expect(isIntegrationConnected(googleLoginAccounts, "google-calendar")).toBe(false)
    expect(isIntegrationConnected(googleLoginAccounts, "google-drive")).toBe(false)
    expect(isIntegrationConnected(googleLoginAccounts, "cal")).toBe(false)
  })

  it("handles whitespace and case-insensitivity defensively", () => {
    const accounts = [{ providerId: "  GMAIL " }]
    expect(isIntegrationConnected(accounts, "gmail")).toBe(true)
    expect(isIntegrationConnected(accounts, " GMail ")).toBe(true)
  })
})
