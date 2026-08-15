import { describe, expect, test } from "bun:test"
import {
  createRecipientFromEmail,
  EMAIL_REGEX,
  getInitials,
} from "./components/composer/composer-recipient-field"

describe("Rich Email Composer Components & Helpers", () => {
  test("getInitials extracts initials accurately from email or names", () => {
    expect(getInitials("insankamil@excel.com")).toBe("IN")
    expect(getInitials("john.leo@excel.com")).toBe("JL")
    expect(getInitials("John Leo")).toBe("JL")
    expect(getInitials("Miguel Lorenzo")).toBe("ML")
    expect(getInitials("")).toBe("?")
  })

  test("EMAIL_REGEX validates correctly", () => {
    expect(EMAIL_REGEX.test("insankamil@excel.com")).toBe(true)
    expect(EMAIL_REGEX.test("john.leo@domain.co.uk")).toBe(true)
    expect(EMAIL_REGEX.test("invalid-email")).toBe(false)
    expect(EMAIL_REGEX.test("@no-local.com")).toBe(false)
  })

  test("createRecipientFromEmail creates well-formed recipient object", () => {
    const recipient = createRecipientFromEmail("john.leo@excel.com")
    expect(recipient.email).toBe("john.leo@excel.com")
    expect(recipient.name).toBe("John Leo")
    expect(recipient.id).toContain("rec-john.leo@excel.com-")
  })
})
