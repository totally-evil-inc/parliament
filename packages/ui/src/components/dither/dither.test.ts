import { describe, expect, test } from "bun:test"
import { isDitherColor, PALETTE, rgb, seedOfColor } from "./palette"
import {
  BAYER4,
  BAYER8,
  clamp01,
  fillOf,
  fnv1a,
  hueFill,
  isCssColor,
  pixelBloomStyle,
  resolveCssFill,
  xorshift32,
} from "./pixel"

describe("Dither Primitives & Math", () => {
  test("BAYER4 matrix has valid normalized thresholds [0, 1]", () => {
    expect(BAYER4).toHaveLength(4)
    for (const row of BAYER4) {
      expect(row).toHaveLength(4)
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
      }
    }
  })

  test("BAYER8 matrix has valid normalized thresholds [0, 1]", () => {
    expect(BAYER8).toHaveLength(8)
    for (const row of BAYER8) {
      expect(row).toHaveLength(8)
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
      }
    }
  })

  test("clamp01 bounds values correctly", () => {
    expect(clamp01(-0.5)).toBe(0)
    expect(clamp01(0.42)).toBe(0.42)
    expect(clamp01(1.8)).toBe(1)
  })

  test("fnv1a produces deterministic uint32 hashes", () => {
    const h1 = fnv1a("test-seed")
    const h2 = fnv1a("test-seed")
    const h3 = fnv1a("other-seed")
    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
    expect(h1).toBeGreaterThanOrEqual(0)
  })

  test("xorshift32 generates reproducible uniform distribution in [0, 1)", () => {
    const rng1 = xorshift32(12345)
    const rng2 = xorshift32(12345)
    const v1 = [rng1(), rng1(), rng1()]
    const v2 = [rng2(), rng2(), rng2()]
    expect(v1).toEqual(v2)
    for (const v of v1) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  test("palette seeds and rgb formatting work accurately", () => {
    expect(seedOfColor("green")).toBeDefined()
    expect(PALETTE.green.fill).toEqual([40, 210, 110])
    expect(rgb([40, 210, 110], 1, 0.5)).toBe("rgba(40,210,110,0.5)")
    expect(fillOf("green")).toEqual([40, 210, 110])
    expect(fillOf([10, 20, 30])).toEqual([10, 20, 30])
    expect(hueFill(120)).toBeDefined()
  })

  test("pixelBloomStyle returns proper CSS filter styles", () => {
    expect(pixelBloomStyle("off")).toBeNull()
    const lowStyle = pixelBloomStyle("low")
    expect(lowStyle).toBeDefined()
    expect(lowStyle?.mixBlendMode).toBe("plus-lighter")
    expect(lowStyle?.filter).toContain("blur")
  })
})

describe("Dither CSS Accent Color Support", () => {
  test("isCssColor distinguishes CSS color strings from named palette colors", () => {
    expect(isCssColor("var(--accent)")).toBe(true)
    expect(isCssColor("oklch(0.32 0 0)")).toBe(true)
    expect(isCssColor("#f59e0b")).toBe(true)
    expect(isCssColor("green")).toBe(false)
    expect(isCssColor("grey")).toBe(false)
    expect(isCssColor([40, 210, 110])).toBe(false)
    expect(isCssColor(120)).toBe(false)
  })

  test("isDitherColor rejects CSS strings while keeping palette names", () => {
    expect(isDitherColor("var(--accent)")).toBe(false)
    expect(isDitherColor("green")).toBe(true)
  })

  test("resolveCssFill falls back safely without a DOM/canvas", () => {
    expect(resolveCssFill("oklch(0.32 0 0)")).toEqual(PALETTE.grey.fill)
    expect(resolveCssFill("var(--accent)", [1, 2, 3])).toEqual([1, 2, 3])
    expect(resolveCssFill("")).toEqual(PALETTE.grey.fill)
  })

  test("fillOf keeps pure palette resolution and falls back for CSS strings", () => {
    expect(fillOf("green")).toEqual([40, 210, 110])
    expect(fillOf("var(--accent)")).toEqual(PALETTE.grey.fill)
    expect(fillOf("oklch(0.32 0 0)")).toEqual(PALETTE.grey.fill)
    expect(fillOf([10, 20, 30])).toEqual([10, 20, 30])
    expect(fillOf(120)).toBeDefined()
  })
})
