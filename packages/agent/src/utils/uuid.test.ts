import { describe, expect, it } from "bun:test"
import { assertUuid, isUuid, UUID_REGEX } from "./uuid"

describe("UUID utilities", () => {
  it("validates UUIDv4 and UUIDv7 correctly", () => {
    const v4 = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
    const v7 = "0198cd55-06f1-7ec2-9e20-72db85422894"

    expect(UUID_REGEX.test(v4)).toBe(true)
    expect(UUID_REGEX.test(v7)).toBe(true)
    expect(isUuid(v4)).toBe(true)
    expect(isUuid(v7)).toBe(true)
  })

  it("handles whitespace defensively in isUuid and assertUuid", () => {
    const paddedV7 = "  0198cd55-06f1-7ec2-9e20-72db85422894  "
    expect(isUuid(paddedV7)).toBe(true)
    const trimmedV7 = "0198cd55-06f1-7ec2-9e20-72db85422894"
    expect(assertUuid(trimmedV7)).toBe(trimmedV7)
    expect(assertUuid(paddedV7)).toBe(trimmedV7)
  })

  it("rejects invalid UUID strings and non-string inputs", () => {
    expect(isUuid("not-a-uuid")).toBe(false)
    expect(isUuid("")).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid(undefined)).toBe(false)
    expect(isUuid(12345)).toBe(false)
    expect(isUuid({})).toBe(false)
    expect(isUuid("0198cd55-06f1-7ec2-9e20")).toBe(false)

    expect(() => assertUuid("invalid-id", "testId")).toThrow(TypeError)
  })
})
