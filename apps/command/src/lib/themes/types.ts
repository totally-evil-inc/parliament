const THEME_MODES = ["light", "dark", "system"] as const
export type ThemeMode = (typeof THEME_MODES)[number]

const THEME_PALETTES = [
  "graphite",
  "indigo",
  "crimson",
  "sage",
  "amber",
  "violet",
] as const
export type ThemePalette = (typeof THEME_PALETTES)[number]

export function isThemePalette(value: unknown): value is ThemePalette {
  return (
    typeof value === "string" &&
    (THEME_PALETTES as ReadonlyArray<string>).includes(value)
  )
}
