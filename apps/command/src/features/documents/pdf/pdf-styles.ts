import type {
  DocumentFontToken,
  DocumentSpacingScale,
  DocumentTemplate,
  DocumentTemplateTokens,
} from "@workspace/document/presentation"

/**
 * Parses a hex color string (#rgb, #rrggbb, #rrggbbaa) into RGBA components [0-255, 0-255, 0-255, 0-1].
 */
export function parseHexColor(hex: string): {
  r: number
  g: number
  b: number
  a: number
} {
  const clean = hex.replace("#", "").trim()
  if (clean.length === 3) {
    const r = Number.parseInt(clean[0] + clean[0], 16) || 0
    const g = Number.parseInt(clean[1] + clean[1], 16) || 0
    const b = Number.parseInt(clean[2] + clean[2], 16) || 0
    return { r, g, b, a: 1 }
  }
  if (clean.length === 4) {
    const r = Number.parseInt(clean[0] + clean[0], 16) || 0
    const g = Number.parseInt(clean[1] + clean[1], 16) || 0
    const b = Number.parseInt(clean[2] + clean[2], 16) || 0
    const a = (Number.parseInt(clean[3] + clean[3], 16) || 255) / 255
    return { r, g, b, a }
  }
  if (clean.length === 6 || clean.length === 8) {
    const r = Number.parseInt(clean.slice(0, 2), 16) || 0
    const g = Number.parseInt(clean.slice(2, 4), 16) || 0
    const b = Number.parseInt(clean.slice(4, 6), 16) || 0
    const a =
      clean.length === 8
        ? (Number.parseInt(clean.slice(6, 8), 16) || 255) / 255
        : 1
    return { r, g, b, a }
  }
  return { r: 0, g: 0, b: 0, a: 1 }
}

/**
 * Formats RGBA components into an rgba(r, g, b, a) CSS-compatible string.
 */
export function toRgbaString(
  r: number,
  g: number,
  b: number,
  a: number
): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.max(0, Math.min(1, a)).toFixed(2)})`
}

/**
 * Creates a translucent tint of a color with specified opacity (0.0 to 1.0).
 */
export function tintColor(hex: string, opacity: number): string {
  const { r, g, b } = parseHexColor(hex)
  return toRgbaString(r, g, b, opacity)
}

/**
 * Blends two hex colors together with a weight (0.0 to 1.0) of color1 over color2.
 */
export function blendColors(
  color1: string,
  color2: string,
  weight: number
): string {
  const c1 = parseHexColor(color1)
  const c2 = parseHexColor(color2)
  const w = Math.max(0, Math.min(1, weight))
  const r = Math.round(c1.r * w + c2.r * (1 - w))
  const g = Math.round(c1.g * w + c2.g * (1 - w))
  const b = Math.round(c1.b * w + c2.b * (1 - w))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Maps document font tokens to standard cross-platform PDF fonts supported by react-pdf.
 */
export function mapFontFamily(
  token: DocumentFontToken,
  isHeading = false
): string {
  switch (token) {
    case "serif":
    case "playfair":
      return "Times-Roman"
    case "mono":
    case "spacemono":
      return "Courier"
    default:
      return isHeading ? "Helvetica-Bold" : "Helvetica"
  }
}

/**
 * Maps spacing scale tokens to numerical point values for PDF layouts.
 */
export function mapSpacingScale(scale: DocumentSpacingScale): {
  sectionMarginBottom: number
  itemGap: number
  headerPadding: number
} {
  switch (scale) {
    case "compact":
      return {
        sectionMarginBottom: 16,
        itemGap: 8,
        headerPadding: 16,
      }
    case "spacious":
      return {
        sectionMarginBottom: 28,
        itemGap: 16,
        headerPadding: 24,
      }
    default:
      return {
        sectionMarginBottom: 22,
        itemGap: 12,
        headerPadding: 20,
      }
  }
}

/**
 * Parses a radius token string (e.g. "0.375rem", "0.75rem", "6px") into numerical points for React-PDF.
 */
export function mapRadius(radiusToken?: string): number {
  if (!radiusToken) return 6
  if (radiusToken.includes("rem")) {
    const val = Number.parseFloat(radiusToken)
    return Math.round(val * 12)
  }
  if (radiusToken.includes("px")) {
    return Number.parseFloat(radiusToken) || 6
  }
  return 6
}

export type ResolvedPdfTheme = {
  tokens: DocumentTemplateTokens
  canvasBackground: string
  pageBackground: string
  foreground: string
  mutedForeground: string
  accent: string
  border: string
  accentTintSubtle: string
  accentTintMedium: string
  accentBorderMix: string
  bodyFont: string
  headingFont: string
  radius: number
  cardRadius: number
  spacing: ReturnType<typeof mapSpacingScale>
}

/**
 * Compiles a DocumentTemplate into an easy-to-use resolved PDF theme palette and typography set.
 */
export function resolvePdfTheme(template: DocumentTemplate): ResolvedPdfTheme {
  const tokens = template.tokens
  const radius = mapRadius(tokens.radius)
  const spacing = mapSpacingScale(tokens.spacingScale)

  return {
    tokens,
    canvasBackground: tokens.canvasBackground,
    pageBackground: tokens.pageBackground,
    foreground: tokens.foreground,
    mutedForeground: tokens.mutedForeground,
    accent: tokens.accent,
    border: tokens.border,
    accentTintSubtle: tintColor(tokens.accent, 0.07),
    accentTintMedium: tintColor(tokens.accent, 0.12),
    accentBorderMix: blendColors(tokens.accent, tokens.border, 0.25),
    bodyFont: mapFontFamily(tokens.fontFamily, false),
    headingFont: mapFontFamily(tokens.headingFontFamily, true),
    radius,
    cardRadius: Math.round(radius * 1.3),
    spacing,
  }
}
