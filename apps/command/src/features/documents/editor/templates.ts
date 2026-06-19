import type {
  DocumentFontToken,
  DocumentTemplate,
  DocumentTemplateStyle,
  DocumentTemplateTokens,
} from "./types"

type TemplateTokenOption<TValue extends string> = {
  value: TValue
  label: string
}

const fontFamilies: Record<DocumentFontToken, string> = {
  sans: "var(--font-sans)",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "var(--font-heading)",
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

const backgroundColors = [
  "#ffffff",
  "#fafafa",
  "#f8fafc",
  "#f9fafb",
  "#f7f7f7",
  "#f5f5f4",
  "#f4f4f5",
  "#f3f4f6",
  "#f1f5f9",
  "#eeeeee",
  "#e7e5e4",
  "#e5e7eb",
  "#e4e4e7",
  "#e2e8f0",
  "#d6d3d1",
  "#d1d5db",
  "#d4d4d8",
  "#cbd5e1",
  "#111827",
  "#18181b",
  "#1e293b",
  "#171717",
  "#0f172a",
] as const

const textColors = [
  "#111827",
  "#171717",
  "#1f2937",
  "#27272a",
  "#334155",
  "#404040",
  "#3f3f46",
  "#475569",
  "#52525b",
  "#57534e",
  "#64748b",
  "#71717a",
  "#737373",
  "#78716c",
  "#94a3b8",
  "#a1a1aa",
  "#cbd5e1",
  "#d4d4d8",
  "#e5e7eb",
  "#f8fafc",
  "#ffffff",
] as const

const accentColors = [
  "#111827",
  "#18181b",
  "#1f2937",
  "#27272a",
  "#334155",
  "#374151",
  "#3f3f46",
  "#404040",
  "#475569",
  "#52525b",
  "#57534e",
  "#64748b",
  "#71717a",
  "#737373",
  "#78716c",
  "#94a3b8",
  "#a1a1aa",
  "#a8a29e",
  "#cbd5e1",
  "#d4d4d8",
] as const

const borderColors = [
  "#e5e7eb",
  "#d1d5db",
  "#cbd5e1",
  "#c7c7c7",
  "#d6d3d1",
  "#e7e5e4",
  "#e4e4e7",
  "#e2e8f0",
  "#d4d4d8",
  "#a8a29e",
  "#a1a1aa",
  "#94a3b8",
  "#78716c",
  "#737373",
  "#71717a",
  "#64748b",
  "#374151",
  "#3f3f46",
  "#475569",
  "#334155",
] as const

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
    canvasBackground: "#f4f5f7",
    pageBackground: "#ffffff",
    foreground: "#111827",
    mutedForeground: "#64748b",
    accent: "#374151",
    border: "#dfe3ea",
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
    canvasBackground: "#0f172a",
    pageBackground: "#1e293b",
    foreground: "#f8fafc",
    mutedForeground: "#b6bdc8",
    accent: "#60a5fa",
    border: "#3f4652",
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
