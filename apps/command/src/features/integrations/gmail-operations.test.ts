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

    expect(gmailInt?.scopes).toContain(
      "https://www.googleapis.com/auth/gmail.send"
    )
    expect(gmailInt?.scopes).toContain(
      "https://www.googleapis.com/auth/gmail.metadata"
    )
    expect(calInt?.scopes).toContain(
      "https://www.googleapis.com/auth/calendar.events.readonly"
    )
    expect(driveInt?.scopes).toContain(
      "https://www.googleapis.com/auth/drive.file"
    )

    // Ensure NO restricted scopes are included
    expect(gmailInt?.scopes).not.toContain("https://mail.google.com/")
    expect(gmailInt?.scopes).not.toContain(
      "https://www.googleapis.com/auth/gmail.readonly"
    )
    expect(gmailInt?.scopes).not.toContain(
      "https://www.googleapis.com/auth/gmail.modify"
    )
  })

  it("lists audit-free actions for Gmail integration", () => {
    const gmailInt = DEFAULT_INTEGRATIONS.find((i) => i.id === "gmail")
    expect(gmailInt?.actions).toContain("gmail_send_email")
    expect(gmailInt?.actions).toContain("gmail_create_draft")
    expect(gmailInt?.actions).toContain("gmail_watch_threads")
    expect(gmailInt?.actions).toContain("gmail_get_activity")
  })
})
