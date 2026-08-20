import { describe, expect, test } from "bun:test"
import { useSmartScrollAnchor } from "./use-smart-scroll-anchor"

describe("useSmartScrollAnchor hook exports and interfaces", () => {
  test("exports useSmartScrollAnchor function", () => {
    expect(typeof useSmartScrollAnchor).toBe("function")
  })
})
