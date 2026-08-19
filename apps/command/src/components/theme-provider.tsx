"use client"

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  APP_PALETTE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
} from "@/lib/themes/constants"
import {
  applyThemeToElement,
  getStoredThemePalette,
  getStoredThemePreference,
  getSystemThemePreference,
  resolveTheme,
  setStoredThemePalette,
  setStoredThemePreference,
} from "@/lib/themes/contract"
import type {
  ResolvedTheme,
  ThemePalette,
  ThemePreference,
} from "@/lib/themes/types"

export type { ResolvedTheme, ThemePalette, ThemePreference }
export { APP_PALETTE_STORAGE_KEY, APP_THEME_STORAGE_KEY }

export type ThemeContextValue = {
  /** User's configured mode preference: 'light', 'dark', or 'system' */
  preference: ThemePreference
  /** Active evaluated theme: 'light' or 'dark' */
  resolved: ResolvedTheme
  /** Active palette identifier */
  palette: ThemePalette
  /** Updates the user's theme preference */
  setPreference: (preference: ThemePreference) => void
  /** Updates the user's color palette */
  setPalette: (palette: ThemePalette) => void
  /** Toggles between light and dark modes explicitly */
  toggleLightDark: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    return getStoredThemePreference()
  })

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    return getSystemThemePreference()
  })

  const [palette, setPaletteState] = useState<ThemePalette>(() => {
    return getStoredThemePalette()
  })

  const resolved = useMemo(() => {
    return resolveTheme(preference, systemTheme)
  }, [preference, systemTheme])

  // Synchronous, defensive setter for theme preference
  const setPreference = useCallback(
    (newPreference: ThemePreference) => {
      const nextResolved = resolveTheme(newPreference, systemTheme)

      // Synchronously update DOM before React state transition to eliminate lag
      if (typeof document !== "undefined") {
        applyThemeToElement(document.documentElement, nextResolved, palette)
      }

      setStoredThemePreference(newPreference)
      setPreferenceState(newPreference)
    },
    [systemTheme, palette]
  )

  // Synchronous, defensive setter for palette
  const setPalette = useCallback(
    (newPalette: ThemePalette) => {
      if (typeof document !== "undefined") {
        applyThemeToElement(document.documentElement, resolved, newPalette)
      }

      setStoredThemePalette(newPalette)
      setPaletteState(newPalette)
    },
    [resolved]
  )

  // Toggle between light and dark based on the currently evaluated theme
  const toggleLightDark = useCallback(() => {
    const nextResolved: ResolvedTheme = resolved === "dark" ? "light" : "dark"
    setPreference(nextResolved)
  }, [resolved, setPreference])

  // Defensive reconciliation effect on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      applyThemeToElement(document.documentElement, resolved, palette)
    }
  }, [resolved, palette])

  // Media-query listener: dynamically track OS theme changes only when preference is 'system'
  useEffect(() => {
    if (
      preference !== "system" ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return
    }

    try {
      const mql = window.matchMedia("(prefers-color-scheme: dark)")

      const handleMediaChange = () => {
        try {
          const isDark = Boolean(mql.matches)
          const nextSystem: ResolvedTheme = isDark ? "dark" : "light"
          setSystemTheme(nextSystem)

          if (typeof document !== "undefined") {
            applyThemeToElement(document.documentElement, nextSystem, palette)
          }
        } catch {
          /* ignore media change evaluation error */
        }
      }

      // Check current state immediately
      handleMediaChange()

      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", handleMediaChange)
        return () => {
          mql.removeEventListener("change", handleMediaChange)
        }
      }

      // Legacy fallback for older browser environments
      // @ts-expect-error - support deprecated listener API safely
      if (typeof mql.addListener === "function") {
        // @ts-expect-error
        mql.addListener(handleMediaChange)
        return () => {
          // @ts-expect-error
          mql.removeListener(handleMediaChange)
        }
      }
    } catch {
      /* ignore matchMedia setup error */
    }
  }, [preference, palette])

  // Cross-tab synchronization via storage event (including localStorage.clear() when key === null)
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleStorageChange = (event: StorageEvent) => {
      try {
        if (event.key === null || event.key === APP_THEME_STORAGE_KEY) {
          const freshPref = getStoredThemePreference()
          setPreferenceState(freshPref)
          const freshResolved = resolveTheme(freshPref, systemTheme)
          if (typeof document !== "undefined") {
            applyThemeToElement(
              document.documentElement,
              freshResolved,
              palette
            )
          }
        }
        if (event.key === null || event.key === APP_PALETTE_STORAGE_KEY) {
          const freshPalette = getStoredThemePalette()
          setPaletteState(freshPalette)
          if (typeof document !== "undefined") {
            applyThemeToElement(
              document.documentElement,
              resolved,
              freshPalette
            )
          }
        }
      } catch {
        /* ignore storage event processing error */
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [systemTheme, palette, resolved])

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      palette,
      setPreference,
      setPalette,
      toggleLightDark,
    }),
    [preference, resolved, palette, setPreference, setPalette, toggleLightDark]
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
