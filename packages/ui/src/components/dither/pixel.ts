import { type DitherColor, isDitherColor, PALETTE, type Rgb } from "./palette"

// 4×4 ordered (Bayer) matrix, normalized to 0–1 thresholds
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

// 8×8 ordered (Bayer) matrix for high precision dithering
export const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => (v + 0.5) / 64))

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

/** 32-bit FNV-1a hash — turns any string seed into a stable uint32. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Tiny deterministic PRNG (xorshift32) — returns floats in [0, 1). */
export function xorshift32(seed: number): () => number {
  let s = seed || 0x9e3779b9
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 0x100000000
  }
}

/** A named palette colour, RGB tuple, a raw hue (0–360), or a CSS color string (e.g. "var(--accent)"). */
export type PixelColor = DitherColor | Rgb | number | string

/** Whether the value is a CSS color string rather than a palette name. */
export function isCssColor(value: unknown): value is string {
  return typeof value === "string" && !isDitherColor(value)
}

/** Hue (0–360) → an rgb fill tuned to sit alongside the palette. */
export function hueFill(hue: number): Rgb {
  const h = ((hue % 360) + 360) % 360
  const s = 0.85
  const l = 0.58
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

/** Resolve a PixelColor to its rgb fill. CSS strings resolve to the grey fallback when no DOM/canvas exists. */
export function fillOf(color: PixelColor): Rgb {
  if (Array.isArray(color)) return color
  if (typeof color === "number") return hueFill(color)
  if (typeof color === "string") {
    if (isDitherColor(color)) return PALETTE[color].fill
    return PALETTE.grey.fill
  }
  return PALETTE.grey.fill
}

/**
 * Resolve a concrete CSS color string (no `var()` — resolve the custom
 * property beforehand) to an RGB fill by sampling a 1×1 canvas. Returns the
 * fallback when the DOM/canvas is unavailable (SSR, tests) or the color is
 * invalid.
 */
export function resolveCssFill(
  cssColor: string,
  fallback: Rgb = PALETTE.grey.fill
): Rgb {
  if (typeof document === "undefined") return fallback
  try {
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext("2d")
    if (!ctx) return fallback
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = cssColor
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return [r, g, b]
  } catch {
    return fallback
  }
}

// Bloom — additive blur copy of the crisp canvas
export type PixelBloom = "off" | "low" | "high" | "aura"

const BLOOM_PRESET: Record<
  Exclude<PixelBloom, "off">,
  { blur: number; brightness: number; opacity: number; saturate: number }
> = {
  low: { blur: 3, brightness: 1.35, opacity: 0.7, saturate: 1.4 },
  high: { blur: 5, brightness: 1.5, opacity: 0.78, saturate: 1.5 },
  aura: { blur: 14, brightness: 2.5, opacity: 0.25, saturate: 2.5 },
}

export type PixelBloomStyle = {
  filter: string
  opacity: number
  mixBlendMode: "plus-lighter"
  imageRendering: "auto"
}

/** Style for the bloom layer canvas. null when off. */
export function pixelBloomStyle(bloom: PixelBloom): PixelBloomStyle | null {
  if (bloom === "off") return null
  const cfg = BLOOM_PRESET[bloom]
  return {
    filter: `blur(${cfg.blur}px) brightness(${cfg.brightness}) saturate(${cfg.saturate})`,
    opacity: cfg.opacity,
    mixBlendMode: "plus-lighter",
    imageRendering: "auto",
  }
}

/** Whether the OS asks for reduced motion. */
export function pixelPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  )
}
