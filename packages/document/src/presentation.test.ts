import { describe, expect, test } from "bun:test"
import {
  darkDocumentTemplate,
  defaultDocumentTemplate,
  documentColorTokenOptions,
  documentFontOptions,
  documentPresets,
  documentRadiusOptions,
  documentSpacingOptions,
  getDocumentTemplate,
  getDocumentTemplateStyle,
  getPresetById,
  isSafeCssColor,
  isSafeRadius,
  normalizeDocumentTemplate,
  normalizeDocumentTemplateReference,
  normalizeDocumentTemplateTokens,
  resolveDocumentTemplate,
  updateDocumentTemplateToken,
  webStudioProposalTemplate,
} from "./presentation"

describe("Document Presentation Tokens & Normalization", () => {
  test("presets have complete and valid token definitions", () => {
    for (const preset of documentPresets) {
      expect(preset.id).toBeTruthy()
      expect(preset.name).toBeTruthy()
      expect(preset.tokens.canvasBackground).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(preset.tokens.pageBackground).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(preset.tokens.foreground).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(preset.tokens.mutedForeground).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(preset.tokens.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(preset.tokens.border).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect([
        "sans",
        "serif",
        "mono",
        "satoshi",
        "cabinet",
        "playfair",
        "spacemono",
      ]).toContain(preset.tokens.fontFamily)
      expect([
        "sans",
        "serif",
        "mono",
        "satoshi",
        "cabinet",
        "playfair",
        "spacemono",
      ]).toContain(preset.tokens.headingFontFamily)
      expect(["compact", "comfortable", "spacious"]).toContain(
        preset.tokens.spacingScale
      )
      expect(preset.tokens.radius).toBeTruthy()
    }
  })

  test("document option catalogs contain expected choices", () => {
    expect(documentFontOptions.map((o) => o.value)).toContain("satoshi")
    expect(documentSpacingOptions.map((o) => o.value)).toEqual([
      "compact",
      "comfortable",
      "spacious",
    ])
    expect(documentRadiusOptions.map((o) => o.value)).toContain("0.75rem")
    expect(documentColorTokenOptions.map((o) => o.key)).toEqual([
      "canvasBackground",
      "pageBackground",
      "foreground",
      "mutedForeground",
      "accent",
      "border",
    ])
  })

  test("isSafeCssColor accepts valid hex, rgb, oklch and rejects dangerous strings", () => {
    expect(isSafeCssColor("#fff")).toBe(true)
    expect(isSafeCssColor("#1a1a1a")).toBe(true)
    expect(isSafeCssColor("#17211dff")).toBe(true)
    expect(isSafeCssColor("rgb(255, 255, 255)")).toBe(true)
    expect(isSafeCssColor("rgba(0, 0, 0, 0.5)")).toBe(true)
    expect(isSafeCssColor("oklch(0.98 0.03 260)")).toBe(true)
    expect(isSafeCssColor("transparent")).toBe(true)

    // Dangerous injections
    expect(isSafeCssColor("red; background: url(javascript:alert(1))")).toBe(
      false
    )
    expect(isSafeCssColor("<script>")).toBe(false)
    expect(isSafeCssColor("expression(alert(1))")).toBe(false)
    expect(isSafeCssColor("")).toBe(false)
    expect(isSafeCssColor(null)).toBe(false)
  })

  test("isSafeRadius accepts valid CSS length values and rejects invalid strings", () => {
    expect(isSafeRadius("0")).toBe(true)
    expect(isSafeRadius("0.75rem")).toBe(true)
    expect(isSafeRadius("12px")).toBe(true)
    expect(isSafeRadius("1rem")).toBe(true)
    expect(isSafeRadius("50%")).toBe(true)

    expect(isSafeRadius("calc(100% - 20px)")).toBe(false)
    expect(isSafeRadius("invalid-string")).toBe(false)
    expect(isSafeRadius("")).toBe(false)
    expect(isSafeRadius(undefined)).toBe(false)
  })

  test("getPresetById returns matching preset or fallback", () => {
    expect(getPresetById("proposal-web-studio")).toEqual(
      webStudioProposalTemplate
    )
    expect(getPresetById("classic-dark")).toEqual(darkDocumentTemplate)
    expect(getPresetById("classic-light")).toEqual(defaultDocumentTemplate)
    expect(getPresetById("proposal-classic", "dark")).toEqual(
      darkDocumentTemplate
    )
    expect(getPresetById("proposal-classic", "light")).toEqual(
      defaultDocumentTemplate
    )
    expect(getPresetById("unknown-preset", "light")).toEqual(
      defaultDocumentTemplate
    )
  })

  test("normalizeDocumentTemplateTokens fills missing fields from preset baseline", () => {
    const partial = {
      accent: "#00ff00",
      fontFamily: "playfair",
    }
    const normalized = normalizeDocumentTemplateTokens(partial, "light")

    expect(normalized.accent).toBe("#00ff00")
    expect(normalized.fontFamily).toBe("playfair")
    // Missing tokens are filled from default light preset
    expect(normalized.canvasBackground).toBe(
      defaultDocumentTemplate.tokens.canvasBackground
    )
    expect(normalized.pageBackground).toBe(
      defaultDocumentTemplate.tokens.pageBackground
    )
    expect(normalized.foreground).toBe(
      defaultDocumentTemplate.tokens.foreground
    )
    expect(normalized.headingFontFamily).toBe(
      defaultDocumentTemplate.tokens.headingFontFamily
    )
    expect(normalized.radius).toBe(defaultDocumentTemplate.tokens.radius)
    expect(normalized.spacingScale).toBe(
      defaultDocumentTemplate.tokens.spacingScale
    )
  })

  test("normalizeDocumentTemplateTokens cleanses unsafe values with fallback", () => {
    const malicious = {
      canvasBackground: "javascript:alert(1)",
      radius: "calc(var(--evil))",
      fontFamily: "comic-sans",
      spacingScale: "ultra-huge",
    }
    const normalized = normalizeDocumentTemplateTokens(malicious, "light")

    expect(normalized.canvasBackground).toBe(
      defaultDocumentTemplate.tokens.canvasBackground
    )
    expect(normalized.radius).toBe(defaultDocumentTemplate.tokens.radius)
    expect(normalized.fontFamily).toBe(
      defaultDocumentTemplate.tokens.fontFamily
    )
    expect(normalized.spacingScale).toBe(
      defaultDocumentTemplate.tokens.spacingScale
    )
  })

  test("normalizeDocumentTemplateReference produces full typed overrides", () => {
    const ref = {
      id: "proposal-web-studio",
      version: 1,
    }
    const normalized = normalizeDocumentTemplateReference(ref, "light")

    expect(normalized.id).toBe("proposal-web-studio")
    expect(normalized.version).toBe(1)
    expect(normalized.overrides).toEqual(webStudioProposalTemplate.tokens)
  })

  test("normalizeDocumentTemplate produces a normalized DocumentTemplate object", () => {
    const template = normalizeDocumentTemplate({
      id: "proposal-web-studio",
      version: 1,
    })
    expect(template.id).toBe("proposal-web-studio")
    expect(template.tokens).toEqual(webStudioProposalTemplate.tokens)
  })

  test("resolveDocumentTemplate resolves custom overrides deterministically", () => {
    const custom = {
      id: "custom-template",
      version: 1,
      overrides: {
        canvasBackground: "#112233",
        accent: "#ff0055",
      },
    }
    const resolved = resolveDocumentTemplate(custom)
    expect(resolved.id).toBe("custom-template")
    expect(resolved.tokens.canvasBackground).toBe("#112233")
    expect(resolved.tokens.accent).toBe("#ff0055")
    expect(resolved.tokens.pageBackground).toBe(
      defaultDocumentTemplate.tokens.pageBackground
    )

    const viaGetDocTemplate = getDocumentTemplate(custom)
    expect(viaGetDocTemplate.tokens).toEqual(resolved.tokens)
  })

  test("resolveDocumentTemplate resolves generic proposal-classic with active appTheme", () => {
    const darkResolved = resolveDocumentTemplate(
      { id: "proposal-classic", version: 1 },
      "dark"
    )
    expect(darkResolved.id).toBe("classic-dark")
    expect(darkResolved.tokens.canvasBackground).toBe(
      darkDocumentTemplate.tokens.canvasBackground
    )
    expect(darkResolved.tokens.pageBackground).toBe(
      darkDocumentTemplate.tokens.pageBackground
    )

    const lightResolved = resolveDocumentTemplate(
      { id: "proposal-classic", version: 1 },
      "light"
    )
    expect(lightResolved.id).toBe("classic-light")
    expect(lightResolved.tokens.canvasBackground).toBe(
      defaultDocumentTemplate.tokens.canvasBackground
    )
    expect(lightResolved.tokens.pageBackground).toBe(
      defaultDocumentTemplate.tokens.pageBackground
    )
  })

  test("updateDocumentTemplateToken immutably updates a single token", () => {
    const original = defaultDocumentTemplate
    const updated = updateDocumentTemplateToken(original, "accent", "#123456")

    expect(updated.tokens.accent).toBe("#123456")
    expect(original.tokens.accent).toBe(defaultDocumentTemplate.tokens.accent)
  })

  test("getDocumentTemplateStyle maps tokens to CSS variables", () => {
    const style = getDocumentTemplateStyle(webStudioProposalTemplate)

    expect(style["--document-canvas-background"]).toBe(
      webStudioProposalTemplate.tokens.canvasBackground
    )
    expect(style["--document-page-background"]).toBe(
      webStudioProposalTemplate.tokens.pageBackground
    )
    expect(style["--document-accent"]).toBe(
      webStudioProposalTemplate.tokens.accent
    )
    expect(style["--document-font-family"]).toContain("Satoshi")
    expect(style["--document-heading-font-family"]).toContain("Cabinet Grotesk")
    expect(style["--document-section-spacing"]).toBe("4rem") // spacious
  })
})
