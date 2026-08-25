export const THEME_MODES = ["light", "dark", "system"] as const
export type ThemeMode = (typeof THEME_MODES)[number]
export type ThemePreference = ThemeMode

export const RESOLVED_THEMES = ["light", "dark"] as const
export type ResolvedTheme = (typeof RESOLVED_THEMES)[number]

export const THEME_PALETTES = [
  "graphite",
  "indigo",
  "crimson",
  "sage",
  "amber",
  "violet",
] as const
export type ThemePalette = (typeof THEME_PALETTES)[number]

/**
 * Type guard for theme mode / preference.
 */
export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (THEME_MODES as ReadonlyArray<string>).includes(value)
  )
}

/**
 * Type guard for resolved theme mode (light or dark).
 */
export function isResolvedTheme(value: unknown): value is ResolvedTheme {
  return (
    typeof value === "string" &&
    (RESOLVED_THEMES as ReadonlyArray<string>).includes(value)
  )
}

/**
 * Type guard for theme palette.
 */
export function isThemePalette(value: unknown): value is ThemePalette {
  return (
    typeof value === "string" &&
    (THEME_PALETTES as ReadonlyArray<string>).includes(value)
  )
}
