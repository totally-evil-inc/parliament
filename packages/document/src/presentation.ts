export type DocumentFontToken =
  | "sans"
  | "serif"
  | "mono"
  | "satoshi"
  | "cabinet"
  | "playfair"
  | "spacemono"

export type DocumentSpacingScale = "compact" | "comfortable" | "spacious"

export type DocumentTemplateTokens = {
  canvasBackground: string
  pageBackground: string
  foreground: string
  mutedForeground: string
  accent: string
  border: string
  fontFamily: DocumentFontToken
  headingFontFamily: DocumentFontToken
  radius: string
  spacingScale: DocumentSpacingScale
}

export type DocumentTemplate = {
  id: string
  name: string
  tokens: DocumentTemplateTokens
}

export type DocumentTemplateReference = {
  id: string
  version: number
  overrides?: Record<string, string | number | boolean | null | undefined>
}

export type DocumentTemplateNormalizedReference = {
  id: string
  version: number
  overrides: DocumentTemplateTokens
}

export type DocumentTemplateStyle = Record<string, string>

type TemplateTokenOption<TValue extends string> = {
  value: TValue
  label: string
}

const fontFamilies: Record<DocumentFontToken, string> = {
  sans: "var(--font-sans)",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "var(--font-heading)",
  satoshi: "Satoshi, var(--font-sans)",
  cabinet: "'Cabinet Grotesk', var(--font-sans)",
  playfair: "'Playfair Display', Georgia, serif",
  spacemono: "'Space Mono', var(--font-heading)",
}

const sectionSpacing: Record<DocumentSpacingScale, string> = {
  compact: "2rem",
  comfortable: "3rem",
  spacious: "4rem",
}

export const documentFontOptions = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
  { value: "satoshi", label: "Satoshi" },
  { value: "cabinet", label: "Cabinet" },
  { value: "playfair", label: "Playfair" },
  { value: "spacemono", label: "Space Mono" },
] satisfies Array<TemplateTokenOption<DocumentFontToken>>

export const documentSpacingOptions = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
] satisfies Array<TemplateTokenOption<DocumentSpacingScale>>

export const documentRadiusOptions = [
  { value: "0.375rem", label: "Small" },
  { value: "0.75rem", label: "Medium" },
  { value: "1rem", label: "Large" },
] as const

const greyscaleColors = [
  "#ffffff",
  "#fafafa",
  "#f5f5f5",
  "#efefef",
  "#e8e8e8",
  "#e0e0e0",
  "#d6d6d6",
  "#cccccc",
  "#c4c4c4",
  "#bababa",
  "#b0b0b0",
  "#a6a6a6",
  "#9a9a9a",
  "#8a8a8a",
  "#7a7a7a",
  "#6a6a6a",
  "#5a5a5a",
  "#4a4a4a",
  "#3a3a3a",
  "#2d2d2d",
  "#1a1a1a",
  "#0d0d0d",
  "#050505",
  "#000000",
] as const

const backgroundColors = greyscaleColors
const textColors = greyscaleColors
const accentColors = greyscaleColors
const borderColors = greyscaleColors

export const documentColorTokenOptions = [
  {
    key: "canvasBackground",
    label: "Canvas",
    colors: backgroundColors,
  },
  {
    key: "pageBackground",
    label: "Page",
    colors: backgroundColors,
  },
  {
    key: "foreground",
    label: "Text",
    colors: textColors,
  },
  {
    key: "mutedForeground",
    label: "Muted text",
    colors: textColors,
  },
  {
    key: "accent",
    label: "Accent",
    colors: accentColors,
  },
  {
    key: "border",
    label: "Border",
    colors: borderColors,
  },
] satisfies Array<{
  key: keyof Pick<
    DocumentTemplateTokens,
    | "canvasBackground"
    | "pageBackground"
    | "foreground"
    | "mutedForeground"
    | "accent"
    | "border"
  >
  label: string
  colors: ReadonlyArray<string>
}>

export const defaultDocumentTemplate: DocumentTemplate = {
  id: "classic-light",
  name: "Classic Light",
  tokens: {
    canvasBackground: "#f7f7f7",
    pageBackground: "#ffffff",
    foreground: "#1a1a1a",
    mutedForeground: "#6a6a6a",
    accent: "#3a3a3a",
    border: "#d0d0d0",
    fontFamily: "sans",
    headingFontFamily: "sans",
    radius: "0.75rem",
    spacingScale: "comfortable",
  },
}

export const webStudioProposalTemplate: DocumentTemplate = {
  id: "proposal-web-studio",
  name: "Web Studio",
  tokens: {
    canvasBackground: "#eef4f1",
    pageBackground: "#fbfdfb",
    foreground: "#17211d",
    mutedForeground: "#66736d",
    accent: "#0f766e",
    border: "#d6e2dd",
    fontFamily: "satoshi",
    headingFontFamily: "cabinet",
    radius: "0.75rem",
    spacingScale: "spacious",
  },
}

export const darkDocumentTemplate: DocumentTemplate = {
  id: "classic-dark",
  name: "Classic Dark",
  tokens: {
    canvasBackground: "#1a1a1a",
    pageBackground: "#0d0d0d",
    foreground: "#c4c4c4",
    mutedForeground: "#a9a9a9",
    accent: "#9a9a9a",
    border: "#0d0d0d",
    fontFamily: "sans",
    headingFontFamily: "sans",
    radius: "0.75rem",
    spacingScale: "comfortable",
  },
}

const defaultDocumentTemplates = {
  light: defaultDocumentTemplate,
  dark: darkDocumentTemplate,
} satisfies Record<"light" | "dark", DocumentTemplate>

export function getDefaultDocumentTemplateForScheme(
  scheme: "light" | "dark"
): DocumentTemplate {
  return defaultDocumentTemplates[scheme]
}

export const documentPresets: ReadonlyArray<DocumentTemplate> = [
  defaultDocumentTemplate,
  darkDocumentTemplate,
  webStudioProposalTemplate,
]

const validFontTokens = new Set<DocumentFontToken>([
  "sans",
  "serif",
  "mono",
  "satoshi",
  "cabinet",
  "playfair",
  "spacemono",
])

const validSpacingScales = new Set<DocumentSpacingScale>([
  "compact",
  "comfortable",
  "spacious",
])

export function isDocumentFontToken(
  value: unknown
): value is DocumentFontToken {
  return (
    typeof value === "string" && validFontTokens.has(value as DocumentFontToken)
  )
}

export function isDocumentSpacingScale(
  value: unknown
): value is DocumentSpacingScale {
  return (
    typeof value === "string" &&
    validSpacingScales.has(value as DocumentSpacingScale)
  )
}

const CSS_COLOR_HEX_REGEX =
  /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const CSS_COLOR_FN_REGEX =
  /^(rgb|rgba|hsl|hsla|oklch|oklab|color)\([^;{}<>()]*\)$/i
const SAFE_NAMED_COLORS = new Set([
  "transparent",
  "currentcolor",
  "inherit",
  "white",
  "black",
])

export function isSafeCssColor(value: unknown): value is string {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (CSS_COLOR_HEX_REGEX.test(trimmed)) return true
  if (SAFE_NAMED_COLORS.has(trimmed.toLowerCase())) return true
  if (CSS_COLOR_FN_REGEX.test(trimmed)) return true
  return false
}

const RADIUS_REGEX = /^(\d+(\.\d+)?(rem|px|em|%)|0)$/

export function isSafeRadius(value: unknown): value is string {
  if (typeof value !== "string") return false
  return RADIUS_REGEX.test(value.trim())
}

export function getPresetById(
  id: string,
  fallbackScheme: "light" | "dark" = "light"
): DocumentTemplate {
  if (id === "proposal-web-studio" || id === "web-studio") {
    return webStudioProposalTemplate
  }
  if (id === "classic-dark") {
    return darkDocumentTemplate
  }
  if (id === "classic-light") {
    return defaultDocumentTemplate
  }
  if (id === "proposal-classic" || id === "invoice-classic") {
    return fallbackScheme === "dark"
      ? darkDocumentTemplate
      : defaultDocumentTemplate
  }
  return fallbackScheme === "dark"
    ? darkDocumentTemplate
    : defaultDocumentTemplate
}

export function normalizeDocumentTemplateTokens(
  rawTokens?: unknown,
  fallbackScheme: "light" | "dark" = "light",
  presetId?: string
): DocumentTemplateTokens {
  const base = getPresetById(presetId ?? "", fallbackScheme).tokens
  if (!rawTokens || typeof rawTokens !== "object") {
    return { ...base }
  }

  const record = rawTokens as Record<string, unknown>

  const canvasBackground = isSafeCssColor(record.canvasBackground)
    ? record.canvasBackground.trim()
    : base.canvasBackground
  const pageBackground = isSafeCssColor(record.pageBackground)
    ? record.pageBackground.trim()
    : base.pageBackground
  const foreground = isSafeCssColor(record.foreground)
    ? record.foreground.trim()
    : base.foreground
  const mutedForeground = isSafeCssColor(record.mutedForeground)
    ? record.mutedForeground.trim()
    : base.mutedForeground
  const accent = isSafeCssColor(record.accent)
    ? record.accent.trim()
    : base.accent
  const border = isSafeCssColor(record.border)
    ? record.border.trim()
    : base.border
  const fontFamily = isDocumentFontToken(record.fontFamily)
    ? record.fontFamily
    : base.fontFamily
  const headingFontFamily = isDocumentFontToken(record.headingFontFamily)
    ? record.headingFontFamily
    : base.headingFontFamily
  const radius = isSafeRadius(record.radius)
    ? record.radius.trim()
    : base.radius
  const spacingScale = isDocumentSpacingScale(record.spacingScale)
    ? record.spacingScale
    : base.spacingScale

  return {
    canvasBackground,
    pageBackground,
    foreground,
    mutedForeground,
    accent,
    border,
    fontFamily,
    headingFontFamily,
    radius,
    spacingScale,
  }
}

export function normalizeDocumentTemplateReference(
  reference: {
    id: string
    version?: number
    overrides?: unknown
  },
  fallbackScheme: "light" | "dark" = "light"
): DocumentTemplateNormalizedReference {
  const id = reference.id || "proposal-classic"
  const version =
    typeof reference.version === "number" && reference.version > 0
      ? reference.version
      : 1
  const overrides = normalizeDocumentTemplateTokens(
    reference.overrides,
    fallbackScheme,
    id
  )

  return {
    id,
    version,
    overrides,
  }
}

export function normalizeDocumentTemplate(
  reference: {
    id: string
    version?: number
    overrides?: unknown
  },
  fallbackScheme: "light" | "dark" = "light"
): DocumentTemplate {
  const base = getPresetById(reference.id, fallbackScheme)
  const tokens = normalizeDocumentTemplateTokens(
    reference.overrides,
    fallbackScheme,
    reference.id
  )

  const isClassic =
    reference.id === "proposal-classic" ||
    reference.id === "invoice-classic" ||
    reference.id === "classic-light" ||
    reference.id === "classic-dark"

  return {
    id: isClassic ? base.id : reference.id,
    name: base.name,
    tokens,
  }
}

export function resolveDocumentTemplate(
  reference: {
    id: string
    version?: number
    overrides?: unknown
  },
  appTheme?: "light" | "dark"
): DocumentTemplate {
  const effectiveScheme: "light" | "dark" =
    reference.id === "classic-dark"
      ? "dark"
      : reference.id === "classic-light"
        ? "light"
        : (appTheme ?? "light")

  const baseTemplate = getPresetById(reference.id, effectiveScheme)

  const tokens = normalizeDocumentTemplateTokens(
    reference.overrides,
    effectiveScheme,
    reference.id
  )

  const isClassic =
    reference.id === "proposal-classic" ||
    reference.id === "invoice-classic" ||
    reference.id === "classic-light" ||
    reference.id === "classic-dark"

  return {
    ...baseTemplate,
    id: isClassic ? baseTemplate.id : reference.id,
    tokens,
  }
}

export function getDocumentTemplate(
  reference: {
    id: string
    version?: number
    overrides?: unknown
  },
  appTheme: "light" | "dark" = "light"
): DocumentTemplate {
  return resolveDocumentTemplate(reference, appTheme)
}

export function updateDocumentTemplateToken<
  TKey extends keyof DocumentTemplateTokens,
>(
  template: DocumentTemplate,
  key: TKey,
  value: DocumentTemplateTokens[TKey]
): DocumentTemplate {
  return {
    ...template,
    tokens: {
      ...template.tokens,
      [key]: value,
    },
  }
}

export function getDocumentTemplateStyle(
  templateOrTokens:
    | DocumentTemplate
    | DocumentTemplateTokens
    | { tokens: DocumentTemplateTokens }
    | DocumentTemplateNormalizedReference
): DocumentTemplateStyle {
  let tokens: DocumentTemplateTokens
  if ("tokens" in templateOrTokens) {
    tokens = templateOrTokens.tokens
  } else if ("overrides" in templateOrTokens && templateOrTokens.overrides) {
    tokens = templateOrTokens.overrides as DocumentTemplateTokens
  } else {
    tokens = templateOrTokens as DocumentTemplateTokens
  }

  const fontFamily = fontFamilies[tokens.fontFamily] ?? fontFamilies.sans
  const headingFontFamily =
    fontFamilies[tokens.headingFontFamily] ?? fontFamilies.sans
  const spacing =
    sectionSpacing[tokens.spacingScale] ?? sectionSpacing.comfortable

  return {
    "--document-canvas-background": tokens.canvasBackground,
    "--document-page-background": tokens.pageBackground,
    "--document-foreground": tokens.foreground,
    "--document-muted-foreground": tokens.mutedForeground,
    "--document-accent": tokens.accent,
    "--document-border": tokens.border,
    "--document-radius": tokens.radius,
    "--document-font-family": fontFamily,
    "--document-heading-font-family": headingFontFamily,
    "--document-section-spacing": spacing,
    "--background": tokens.pageBackground,
    "--foreground": tokens.foreground,
    "--muted-foreground": tokens.mutedForeground,
    "--primary": tokens.accent,
    "--border": tokens.border,
    fontFamily,
  }
}
