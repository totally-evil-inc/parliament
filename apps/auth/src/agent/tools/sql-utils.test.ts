import { describe, expect, it } from "bun:test"
import { escapeLikePattern } from "./sql-utils"

describe("SQL LIKE Pattern Sanitization", () => {
  it("escapes %, _, and \\ characters", () => {
    expect(escapeLikePattern("100% discount")).toBe("100\\% discount")
    expect(escapeLikePattern("user_name")).toBe("user\\_name")
    expect(escapeLikePattern("path\\to\\file")).toBe("path\\\\to\\\\file")
    expect(escapeLikePattern("%_%")).toBe("\\%\\_\\%")
  })

  it("handles null, undefined, and non-string inputs safely", () => {
    expect(escapeLikePattern(null)).toBe("")
    expect(escapeLikePattern(undefined)).toBe("")
    expect(escapeLikePattern(123)).toBe("")
    expect(escapeLikePattern({})).toBe("")
  })

  it("leaves standard alphanumeric and punctuation strings untouched", () => {
    expect(escapeLikePattern("Acme Corp")).toBe("Acme Corp")
    expect(escapeLikePattern("Project Alpha - 2026")).toBe(
      "Project Alpha - 2026"
    )
  })
})
