import { describe, expect, it } from "bun:test"
import { DEFAULT_INTEGRATIONS } from "./data"

describe("Command App Integration Configuration & Scopes", () => {
  it("defines individual Google integrations with non-restricted scopes", () => {
    const gmailInt = DEFAULT_INTEGRATIONS.find((i) => i.id === "gmail")
    const calInt = DEFAULT_INTEGRATIONS.find((i) => i.id === "google-calendar")
    const driveInt = DEFAULT_INTEGRATIONS.find((i) => i.id === "google-drive")

    expect(gmailInt).toBeDefined()
    expect(calInt).toBeDefined()
    expect(driveInt).toBeDefined()

    const gmailScopes = gmailInt?.scopes ?? []
    const calScopes = calInt?.scopes ?? []
    const driveScopes = driveInt?.scopes ?? []

    expect(gmailScopes).toContain("https://www.googleapis.com/auth/gmail.send")
    expect(gmailScopes).toContain(
      "https://www.googleapis.com/auth/gmail.metadata"
    )
    expect(calScopes).toContain(
      "https://www.googleapis.com/auth/calendar.events.readonly"
    )
    expect(driveScopes).toContain("https://www.googleapis.com/auth/drive.file")

    // Ensure NO restricted scopes are included
    expect(gmailScopes).not.toContain("https://mail.google.com/")
    expect(gmailScopes).not.toContain(
      "https://www.googleapis.com/auth/gmail.readonly"
    )
    expect(gmailScopes).not.toContain(
      "https://www.googleapis.com/auth/gmail.modify"
    )
  })

  it("lists supported tool actions for Gmail integration", () => {
    const gmailInt = DEFAULT_INTEGRATIONS.find((i) => i.id === "gmail")
    expect(gmailInt).toBeDefined()
    const actions = gmailInt?.actions ?? []
    expect(actions).toContain("gmail_send_email")
    expect(actions).toContain("gmail_create_draft")
    expect(actions).toContain("gmail_watch_threads")
    expect(actions).toContain("gmail_get_activity")
  })

  it("includes rich sheet redesign metadata (author, documentationUrl, overview, previews)", () => {
    const gmailInt = DEFAULT_INTEGRATIONS.find((i) => i.id === "gmail")
    expect(gmailInt).toBeDefined()
    expect(gmailInt?.author).toBe("Google.com")
    expect(gmailInt?.documentationUrl).toBeDefined()
    expect(gmailInt?.overview).toContain("Gmail API")
    expect(gmailInt?.howItWorks).toContain("The Gmail API offers a ready-to-use solution")
    expect(gmailInt?.previews).toBeDefined()
    expect(gmailInt?.previews?.length).toBeGreaterThan(0)
  })
})
