import { describe, expect, it } from "bun:test"
import {
  generateGoogleWebComposeUrl,
  generateMailtoUrl,
} from "./mailto-generator"

describe("Mailto & Web Compose Link Generator", () => {
  it("generates valid mailto URL with encoded parameters", () => {
    const url = generateMailtoUrl({
      to: "john@acme.corp",
      subject: "Proposal v2 Review",
      body: "Hi John, review your proposal here: https://command.app/p/123",
    })

    expect(url.startsWith("mailto:john@acme.corp?")).toBe(true)
    const queryIndex = url.indexOf("?")
    const queryPart = queryIndex !== -1 ? url.slice(queryIndex + 1) : ""
    const params = new URLSearchParams(queryPart)
    expect(params.get("subject")).toBe("Proposal v2 Review")
    expect(params.get("body")).toContain("https://command.app/p/123")
  })

  it("generates valid Google Web Compose URL for browser new tab dispatches", () => {
    const urlString = generateGoogleWebComposeUrl({
      to: "john@acme.corp",
      subject: "Invoice #101",
      body: "Payment link attached.",
    })

    const parsed = new URL(urlString)
    expect(parsed.origin).toBe("https://mail.google.com")
    expect(parsed.pathname).toBe("/mail/")
    expect(parsed.searchParams.get("view")).toBe("cm")
    expect(parsed.searchParams.get("to")).toBe("john@acme.corp")
    expect(parsed.searchParams.get("su")).toBe("Invoice #101")
  })
})
