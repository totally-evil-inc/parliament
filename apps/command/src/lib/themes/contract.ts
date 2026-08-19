import {
  APP_PALETTE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  DEFAULT_PALETTE,
  DEFAULT_RESOLVED_THEME,
  DEFAULT_THEME_PREFERENCE,
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  THEME_ATTR_PALETTE,
  THEME_CLASS_DARK,
} from "./constants"
import {
  isResolvedTheme,
  isThemePalette,
  isThemePreference,
  type ResolvedTheme,
  type ThemePalette,
  type ThemePreference,
} from "./types"

/**
 * Safely resolves the browser localStorage object or returns null
 * if execution environment does not permit storage access (SSR, sandboxed iframes, disabled storage).
 *
 * NOTE: Does not perform write probes to ensure reading persisted preferences succeeds
 * even when storage quota is exceeded.
 */
export function getSafeLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    return window.localStorage ?? null
  } catch {
    // Catches SecurityError / restricted context exceptions
    return null
  }
}

/**
 * Defensively reads the persisted theme preference from storage.
 * Gracefully handles legacy migration keys, corrupted values, throwing storage, and SSR.
 */
export function getStoredThemePreference(
  storage: Storage | null = getSafeLocalStorage()
): ThemePreference {
  if (!storage) {
    return DEFAULT_THEME_PREFERENCE
  }

  try {
    const primary = storage.getItem(APP_THEME_STORAGE_KEY)
    if (primary !== null && isThemePreference(primary)) {
      return primary
    }

    const legacy = storage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (legacy !== null && isThemePreference(legacy)) {
      // Opportunistically migrate to primary key if writable
      try {
        storage.setItem(APP_THEME_STORAGE_KEY, legacy)
      } catch {
        /* ignore migration write failure */
      }
      return legacy
    }
  } catch {
    /* ignore storage access error */
  }

  return DEFAULT_THEME_PREFERENCE
}

/**
 * Defensively reads the persisted theme palette from storage.
 * Gracefully handles legacy migration keys, corrupted values, throwing storage, and SSR.
 */
export function getStoredThemePalette(
  storage: Storage | null = getSafeLocalStorage()
): ThemePalette {
  if (!storage) {
    return DEFAULT_PALETTE
  }

  try {
    const primary = storage.getItem(APP_PALETTE_STORAGE_KEY)
    if (primary !== null && isThemePalette(primary)) {
      return primary
    }

    const legacy = storage.getItem(LEGACY_PALETTE_STORAGE_KEY)
    if (legacy !== null && isThemePalette(legacy)) {
      try {
        storage.setItem(APP_PALETTE_STORAGE_KEY, legacy)
      } catch {
        /* ignore migration write failure */
      }
      return legacy
    }
  } catch {
    /* ignore storage access error */
  }

  return DEFAULT_PALETTE
}

/**
 * Defensively persists theme preference to storage.
 * Returns true if persisted successfully, false otherwise.
 */
export function setStoredThemePreference(
  preference: ThemePreference,
  storage: Storage | null = getSafeLocalStorage()
): boolean {
  if (!storage || !isThemePreference(preference)) {
    return false
  }

  try {
    storage.setItem(APP_THEME_STORAGE_KEY, preference)
    return true
  } catch {
    return false
  }
}

/**
 * Defensively persists theme palette to storage.
 * Returns true if persisted successfully, false otherwise.
 */
export function setStoredThemePalette(
  palette: ThemePalette,
  storage: Storage | null = getSafeLocalStorage()
): boolean {
  if (!storage || !isThemePalette(palette)) {
    return false
  }

  try {
    storage.setItem(APP_PALETTE_STORAGE_KEY, palette)
    return true
  } catch {
    return false
  }
}

/**
 * Defensively queries the host operating system's color scheme preference.
 * Degrades deterministically to DEFAULT_RESOLVED_THEME on SSR, missing matchMedia, or error.
 */
export function getSystemThemePreference(
  targetWindow: Window | null = typeof window !== "undefined" ? window : null
): ResolvedTheme {
  if (!targetWindow || typeof targetWindow.matchMedia !== "function") {
    return DEFAULT_RESOLVED_THEME
  }

  try {
    const mql = targetWindow.matchMedia("(prefers-color-scheme: dark)")
    if (mql && typeof mql.matches === "boolean") {
      return mql.matches ? "dark" : "light"
    }
  } catch {
    /* ignore matchMedia evaluation error */
  }

  return DEFAULT_RESOLVED_THEME
}

/**
 * Pure function resolving the concrete theme ("light" | "dark") from
 * user preference and current system scheme.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme = DEFAULT_RESOLVED_THEME
): ResolvedTheme {
  if (preference === "system") {
    return isResolvedTheme(systemTheme) ? systemTheme : DEFAULT_RESOLVED_THEME
  }
  if (isResolvedTheme(preference)) {
    return preference
  }
  return DEFAULT_RESOLVED_THEME
}

/**
 * Defensively applies resolved theme state and optional palette to a DOM element (typically document.documentElement).
 * Updates:
 * 1. CSS class .dark (toggled based on resolved theme)
 * 2. style.colorScheme ('light' or 'dark')
 * 3. data-palette attribute (if valid palette provided)
 *
 * Returns true if applied without errors, false otherwise.
 */
export function applyThemeToElement(
  element: HTMLElement | null | undefined,
  resolved: ResolvedTheme,
  palette?: ThemePalette | null
): boolean {
  if (!element) {
    return false
  }

  try {
    const safeResolved = isResolvedTheme(resolved)
      ? resolved
      : DEFAULT_RESOLVED_THEME
    const isDark = safeResolved === "dark"

    if (element.classList && typeof element.classList.toggle === "function") {
      element.classList.toggle(THEME_CLASS_DARK, isDark)
    }

    if (element.style) {
      element.style.colorScheme = safeResolved
    }

    if (
      palette &&
      isThemePalette(palette) &&
      typeof element.setAttribute === "function"
    ) {
      element.setAttribute(THEME_ATTR_PALETTE, palette)
    }

    return true
  } catch {
    return false
  }
}
