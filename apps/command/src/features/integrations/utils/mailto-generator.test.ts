import { describe, expect, it } from "bun:test"
import { generateGoogleWebComposeUrl, generateMailtoUrl } from "./mailto-generator"

describe("Mailto & Web Compose Link Generator", () => {
  it("generates valid mailto URL with encoded parameters", () => {
    const url = generateMailtoUrl({
      to: "john@acme.corp",
      subject: "Proposal v2 Review",
      body: "Hi John, review your proposal here: https://command.app/p/123",
    })

    expect(url.startsWith("mailto:john%40acme.corp?")).toBe(true)
    expect(url.includes("subject=Proposal%20v2%20Review")).toBe(true)
    expect(url.includes("body=Hi%20John")).toBe(true)
  })

  it("generates valid Google Web Compose URL for browser new tab dispatches", () => {
    const url = generateGoogleWebComposeUrl({
      to: "john@acme.corp",
      subject: "Invoice #101",
      body: "Payment link attached.",
    })

    expect(url.startsWith("https://mail.google.com/mail/?")).toBe(true)
    expect(url.includes("view=cm")).toBe(true)
    expect(url.includes("to=john%40acme.corp")).toBe(true)
  })
})
