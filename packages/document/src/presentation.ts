export type DocumentFontToken =
  | "sans"
  | "serif"
  | "mono"
  | "satoshi"
  | "cabinet"
  | "playfair"
  | "spacemono"

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
  spacingScale: "compact" | "comfortable" | "spacious"
}

export type DocumentTemplate = {
  id: string
  name: string
  tokens: DocumentTemplateTokens
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

const sectionSpacing: Record<
  DocumentTemplate["tokens"]["spacingScale"],
  string
> = {
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
] satisfies Array<TemplateTokenOption<DocumentTemplateTokens["spacingScale"]>>

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

const darkDocumentTemplate: DocumentTemplate = {
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

export function getDefaultDocumentTemplateForScheme(scheme: "light" | "dark") {
  return defaultDocumentTemplates[scheme]
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
  template: DocumentTemplate
): DocumentTemplateStyle {
  const { tokens } = template
  const fontFamily = fontFamilies[tokens.fontFamily]
  const headingFontFamily = fontFamilies[tokens.headingFontFamily]

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
    "--document-section-spacing": sectionSpacing[tokens.spacingScale],
    "--background": tokens.pageBackground,
    "--foreground": tokens.foreground,
    "--muted-foreground": tokens.mutedForeground,
    "--primary": tokens.accent,
    "--border": tokens.border,
    fontFamily,
  }
}
