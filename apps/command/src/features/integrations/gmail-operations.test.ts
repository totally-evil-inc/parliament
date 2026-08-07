import { describe, expect, it } from "bun:test"
import { DEFAULT_INTEGRATIONS } from "./data"

describe("Command App Integration Configuration & Scopes", () => {
  it("defines Google Workspace integration with non-restricted scopes", () => {
    const googleInt = DEFAULT_INTEGRATIONS.find((i) => i.id === "google")
    expect(googleInt).toBeDefined()
    expect(googleInt?.scopes).toContain(
      "https://www.googleapis.com/auth/gmail.send"
    )
    expect(googleInt?.scopes).toContain(
      "https://www.googleapis.com/auth/gmail.metadata"
    )
    expect(googleInt?.scopes).toContain(
      "https://www.googleapis.com/auth/calendar.events.readonly"
    )
    expect(googleInt?.scopes).toContain(
      "https://www.googleapis.com/auth/drive.file"
    )

    // Ensure NO restricted scopes are included
    expect(googleInt?.scopes).not.toContain("https://mail.google.com/")
    expect(googleInt?.scopes).not.toContain(
      "https://www.googleapis.com/auth/gmail.readonly"
    )
    expect(googleInt?.scopes).not.toContain(
      "https://www.googleapis.com/auth/gmail.modify"
    )
  })

  it("lists audit-free actions for Google integration", () => {
    const googleInt = DEFAULT_INTEGRATIONS.find((i) => i.id === "google")
    expect(googleInt?.actions).toContain("gmail_send_email")
    expect(googleInt?.actions).toContain("gmail_create_draft")
    expect(googleInt?.actions).toContain("gmail_watch_threads")
    expect(googleInt?.actions).toContain("gmail_get_activity")
  })
})
