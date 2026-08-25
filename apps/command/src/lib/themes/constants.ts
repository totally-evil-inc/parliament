import type { ResolvedTheme, ThemePalette, ThemePreference } from "./types"

/** Primary localStorage key for theme mode preference. */
export const APP_THEME_STORAGE_KEY = "command-theme"

/** Primary localStorage key for theme palette preference. */
export const APP_PALETTE_STORAGE_KEY = "command-palette"

/**
 * Legacy storage keys from previous application iterations.
 * Supported defensively during reads for transparent migration.
 */
export const LEGACY_THEME_STORAGE_KEY = "orbit-theme"
export const LEGACY_PALETTE_STORAGE_KEY = "orbit-theme-palette"

/** DOM token representation for dark mode. */
export const THEME_CLASS_DARK = "dark"

/** DOM attribute representation for custom palette. */
export const THEME_ATTR_PALETTE = "data-palette"

/** Default theme preference when unconfigured or corrupted. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system"

/**
 * Deterministic fallback resolved theme when OS/browser media queries
 * are unavailable, unparseable, or indeterminate.
 */
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = "light"

/** Default color palette. */
export const DEFAULT_PALETTE: ThemePalette = "graphite"
