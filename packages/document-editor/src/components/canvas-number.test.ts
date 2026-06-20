import { describe, expect, test } from "bun:test"
import {
  isCanvasNumberDraft,
  normalizeCanvasNumberDraft,
  parseCanvasNumberDraft,
} from "./canvas-number"

describe("canvas number editing", () => {
  test("accepts intermediate non-negative decimal strings", () => {
    expect(isCanvasNumberDraft("")).toBe(true)
    expect(isCanvasNumberDraft("1.")).toBe(true)
    expect(isCanvasNumberDraft(".5")).toBe(true)
    expect(isCanvasNumberDraft("1.25")).toBe(true)
    expect(isCanvasNumberDraft("-1")).toBe(false)
    expect(isCanvasNumberDraft("1,000")).toBe(false)
  })

  test("parses and normalizes incomplete values safely", () => {
    expect(parseCanvasNumberDraft("1.")).toBe(1)
    expect(parseCanvasNumberDraft(".5")).toBe(0.5)
    expect(normalizeCanvasNumberDraft("")).toBe("0")
    expect(normalizeCanvasNumberDraft("01.50")).toBe("1.5")
  })
})
