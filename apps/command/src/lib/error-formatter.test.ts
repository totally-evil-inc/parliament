import { describe, expect, it } from "bun:test"
import { getErrorMessage } from "./error-formatter"

describe("Error Formatter Utility", () => {
  it("sanitizes raw SQL database errors into clean human message", () => {
    const rawSqlError = new Error(
      'Failed query: select "company"."id", "company"."billing_email" from "company"'
    )
    expect(getErrorMessage(rawSqlError)).toBe(
      "Database operation failed. Please refresh or try again later."
    )
  })

  it("sanitizes unauthorized errors", () => {
    expect(getErrorMessage(new Error("Unauthorized"))).toBe(
      "Session expired or unauthorized. Please sign in again."
    )
  })

  it("sanitizes Zod errors", () => {
    expect(getErrorMessage(new Error("ZodError: invalid_type"))).toBe(
      "Invalid input data. Please check your form values."
    )
  })

  it("preserves safe short error messages", () => {
    expect(getErrorMessage(new Error("Customer not found"))).toBe(
      "Customer not found"
    )
  })

  it("returns fallback message for unknown or null errors", () => {
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback")
  })
})
