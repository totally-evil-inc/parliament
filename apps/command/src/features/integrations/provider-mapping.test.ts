import { describe, expect, it } from "bun:test"
import {
  getRelatedDisconnectProviders,
  isIntegrationConnected,
} from "./provider-mapping"

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

  it("is case-insensitive and trims whitespace defensively", () => {
    const accounts = [{ providerId: " Google " }]
    expect(isIntegrationConnected(accounts, " GMAIL ")).toBe(true)
    expect(isIntegrationConnected(accounts, "google-calendar")).toBe(true)
  })

  it("handles malformed account objects defensively without throwing", () => {
    const accounts = [
      null as unknown as { providerId: string },
      undefined as unknown as { providerId: string },
      { providerId: 123 as unknown as string },
      { providerId: "cal" },
    ]
    expect(isIntegrationConnected(accounts, "cal")).toBe(true)
    expect(isIntegrationConnected(accounts, "gmail")).toBe(false)
  })
})

describe("provider-mapping: getRelatedDisconnectProviders", () => {
  it("returns all Google family providers when disconnecting any Google service", () => {
    const expected = ["google", "gmail", "google-calendar", "google-drive"]
    expect(getRelatedDisconnectProviders("google")).toEqual(expected)
    expect(getRelatedDisconnectProviders("gmail")).toEqual(expected)
    expect(getRelatedDisconnectProviders("google-calendar")).toEqual(expected)
    expect(getRelatedDisconnectProviders("google-drive")).toEqual(expected)
  })

  it("returns isolated provider for non-Google integrations", () => {
    expect(getRelatedDisconnectProviders("cal")).toEqual(["cal"])
    expect(getRelatedDisconnectProviders("github")).toEqual(["github"])
  })

  it("handles empty or non-string inputs defensively", () => {
    expect(getRelatedDisconnectProviders("")).toEqual([])
    expect(getRelatedDisconnectProviders(null as unknown as string)).toEqual([])
  })
})
