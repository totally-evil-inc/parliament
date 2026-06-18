"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ThemePalette } from "@/lib/themes/types"
import { isThemePalette } from "@/lib/themes/types"
import { DEFAULT_PALETTE } from "@/lib/themes/palettes"

/** localStorage key for mode preference. */
export const APP_THEME_STORAGE_KEY = "command-theme"
/** localStorage key for palette preference. */
export const APP_PALETTE_STORAGE_KEY = "command-palette"

/** @deprecated legacy orbit keys */
const LEGACY_THEME_KEY = "orbit-theme"
const LEGACY_PALETTE_KEY = "orbit-theme-palette"

export type ThemePreference = "light" | "dark" | "system"

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system"
  try {
    const raw =
      localStorage.getItem(APP_THEME_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_THEME_KEY)
    if (raw === "light" || raw === "dark" || raw === "system") return raw
  } catch {
    /* ignore */
  }
  return "system"
}

function readPalette(): ThemePalette {
  if (typeof window === "undefined") return DEFAULT_PALETTE
  try {
    const raw =
      localStorage.getItem(APP_PALETTE_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_PALETTE_KEY)
    if (isThemePalette(raw)) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_PALETTE
}

function readOsScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

type ThemeContextValue = {
  preference: ThemePreference
  resolved: "light" | "dark"
  palette: ThemePalette
  setPreference: (p: ThemePreference) => void
  setPalette: (p: ThemePalette) => void
  toggleLightDark: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : readPreference()
  )

  const [osScheme, setOsScheme] = useState<"light" | "dark">(() =>
    typeof window === "undefined" ? "dark" : readOsScheme()
  )

  const [palette, setPaletteState] = useState<ThemePalette>(() =>
    typeof window === "undefined" ? DEFAULT_PALETTE : readPalette()
  )

  const resolved = preference === "system" ? osScheme : preference

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }, [resolved])

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette)
  }, [palette])

  useEffect(() => {
    try {
      localStorage.setItem(APP_THEME_STORAGE_KEY, preference)
    } catch {
      /* ignore */
    }
  }, [preference])

  useEffect(() => {
    try {
      localStorage.setItem(APP_PALETTE_STORAGE_KEY, palette)
    } catch {
      /* ignore */
    }
  }, [palette])

  useEffect(() => {
    if (preference !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setOsScheme(mq.matches ? "dark" : "light")
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [preference])

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p)
  }, [])

  const setPalette = useCallback((p: ThemePalette) => {
    setPaletteState(p)
  }, [])

  const toggleLightDark = useCallback(() => {
    setPreferenceState((prev) => {
      const r =
        prev === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : prev
      return r === "dark" ? "light" : "dark"
    })
  }, [])

  const value = useMemo(
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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return ctx
}
