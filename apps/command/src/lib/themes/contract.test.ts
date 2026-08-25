import { describe, expect, it } from "bun:test"
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
  applyThemeToElement,
  getSafeLocalStorage,
  getStoredThemePalette,
  getStoredThemePreference,
  getSystemThemePreference,
  resolveTheme,
  setStoredThemePalette,
  setStoredThemePreference,
} from "./contract"
import { isResolvedTheme, isThemePalette, isThemePreference } from "./types"

// Helper in-memory mock Storage
function createMockStorage(initialData: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initialData))
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

// Throwing storage simulator (e.g. QuotaExceededError or SecurityError in private browsing)
function createThrowingStorage(): Storage {
  return {
    getItem: () => {
      throw new Error("SecurityError: The operation is insecure.")
    },
    setItem: () => {
      throw new Error("QuotaExceededError: storage quota exceeded.")
    },
    removeItem: () => {
      throw new Error("SecurityError: Access is denied.")
    },
    clear: () => {
      throw new Error("SecurityError: Access is denied.")
    },
    key: () => null,
    length: 0,
  }
}

describe("Theme Type Guards", () => {
  it("validates theme preferences accurately", () => {
    expect(isThemePreference("light")).toBe(true)
    expect(isThemePreference("dark")).toBe(true)
    expect(isThemePreference("system")).toBe(true)
    expect(isThemePreference("invalid")).toBe(false)
    expect(isThemePreference(null)).toBe(false)
    expect(isThemePreference(undefined)).toBe(false)
    expect(isThemePreference(123)).toBe(false)
    expect(isThemePreference({})).toBe(false)
  })

  it("validates resolved themes accurately", () => {
    expect(isResolvedTheme("light")).toBe(true)
    expect(isResolvedTheme("dark")).toBe(true)
    expect(isResolvedTheme("system")).toBe(false)
    expect(isResolvedTheme("other")).toBe(false)
    expect(isResolvedTheme(null)).toBe(false)
  })

  it("validates theme palettes accurately", () => {
    expect(isThemePalette("graphite")).toBe(true)
    expect(isThemePalette("indigo")).toBe(true)
    expect(isThemePalette("crimson")).toBe(true)
    expect(isThemePalette("sage")).toBe(true)
    expect(isThemePalette("amber")).toBe(true)
    expect(isThemePalette("violet")).toBe(true)
    expect(isThemePalette("rainbow")).toBe(false)
    expect(isThemePalette("")).toBe(false)
    expect(isThemePalette(null)).toBe(false)
  })
})

describe("getSafeLocalStorage helper", () => {
  it("resolves safely when window is available", () => {
    const storage = getSafeLocalStorage()
    // In Bun test environment window may or may not be defined
    if (typeof window !== "undefined") {
      expect(storage).toBeDefined()
    } else {
      expect(storage).toBeNull()
    }
  })
})

describe("Stored Theme Preference Accessors", () => {
  it("returns default when storage is null or undefined (SSR context)", () => {
    expect(getStoredThemePreference(null)).toBe(DEFAULT_THEME_PREFERENCE)
  })

  it("reads explicit stored preference from primary key", () => {
    const storage = createMockStorage({ [APP_THEME_STORAGE_KEY]: "dark" })
    expect(getStoredThemePreference(storage)).toBe("dark")
  })

  it("migrates and returns legacy theme key when primary key is missing", () => {
    const storage = createMockStorage({ [LEGACY_THEME_STORAGE_KEY]: "light" })
    expect(getStoredThemePreference(storage)).toBe("light")
    // Assert migration wrote to primary key
    expect(storage.getItem(APP_THEME_STORAGE_KEY)).toBe("light")
  })

  it("falls back to default on corrupted or unknown storage values", () => {
    const storage = createMockStorage({
      [APP_THEME_STORAGE_KEY]: "corrupted_mode_123",
    })
    expect(getStoredThemePreference(storage)).toBe(DEFAULT_THEME_PREFERENCE)
  })

  it("degrades gracefully to default when storage access throws", () => {
    const throwingStorage = createThrowingStorage()
    expect(getStoredThemePreference(throwingStorage)).toBe(
      DEFAULT_THEME_PREFERENCE
    )
  })

  it("writes valid theme preference successfully", () => {
    const storage = createMockStorage()
    const success = setStoredThemePreference("dark", storage)
    expect(success).toBe(true)
    expect(storage.getItem(APP_THEME_STORAGE_KEY)).toBe("dark")
  })

  it("rejects writing invalid preference values and returns false", () => {
    const storage = createMockStorage()
    // @ts-expect-error test invalid value at runtime
    const success = setStoredThemePreference("invalid-pref", storage)
    expect(success).toBe(false)
    expect(storage.getItem(APP_THEME_STORAGE_KEY)).toBeNull()
  })

  it("handles throwing storage on write without uncaught exceptions", () => {
    const throwingStorage = createThrowingStorage()
    const success = setStoredThemePreference("light", throwingStorage)
    expect(success).toBe(false)
  })
})

describe("Stored Theme Palette Accessors", () => {
  it("returns default palette when storage is null", () => {
    expect(getStoredThemePalette(null)).toBe(DEFAULT_PALETTE)
  })

  it("reads stored palette from primary key", () => {
    const storage = createMockStorage({ [APP_PALETTE_STORAGE_KEY]: "indigo" })
    expect(getStoredThemePalette(storage)).toBe("indigo")
  })

  it("migrates and returns legacy palette key when primary key is missing", () => {
    const storage = createMockStorage({
      [LEGACY_PALETTE_STORAGE_KEY]: "crimson",
    })
    expect(getStoredThemePalette(storage)).toBe("crimson")
    expect(storage.getItem(APP_PALETTE_STORAGE_KEY)).toBe("crimson")
  })

  it("falls back to default palette on invalid values", () => {
    const storage = createMockStorage({
      [APP_PALETTE_STORAGE_KEY]: "nonexistent-palette",
    })
    expect(getStoredThemePalette(storage)).toBe(DEFAULT_PALETTE)
  })

  it("degrades gracefully when storage throws", () => {
    const throwingStorage = createThrowingStorage()
    expect(getStoredThemePalette(throwingStorage)).toBe(DEFAULT_PALETTE)
  })

  it("writes valid palette successfully", () => {
    const storage = createMockStorage()
    const success = setStoredThemePalette("sage", storage)
    expect(success).toBe(true)
    expect(storage.getItem(APP_PALETTE_STORAGE_KEY)).toBe("sage")
  })

  it("rejects writing invalid palette values", () => {
    const storage = createMockStorage()
    // @ts-expect-error test invalid value
    const success = setStoredThemePalette("neon-pink", storage)
    expect(success).toBe(false)
  })
})

describe("System Theme Preference Resolution", () => {
  it("returns fallback on null window (SSR)", () => {
    expect(getSystemThemePreference(null)).toBe(DEFAULT_RESOLVED_THEME)
  })

  it("returns fallback if matchMedia is missing or not a function", () => {
    const mockWindow = {} as Window
    expect(getSystemThemePreference(mockWindow)).toBe(DEFAULT_RESOLVED_THEME)
  })

  it("resolves dark when OS prefers dark", () => {
    const mockWindow = {
      matchMedia: (query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }),
    } as unknown as Window
    expect(getSystemThemePreference(mockWindow)).toBe("dark")
  })

  it("resolves light when OS prefers light", () => {
    const mockWindow = {
      matchMedia: () => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }),
    } as unknown as Window
    expect(getSystemThemePreference(mockWindow)).toBe("light")
  })

  it("handles non-boolean matches property in matchMedia defensively", () => {
    const mockWindow = {
      matchMedia: () => ({
        matches: "truthy_non_boolean",
        media: "(prefers-color-scheme: dark)",
      }),
    } as unknown as Window
    expect(getSystemThemePreference(mockWindow)).toBe(DEFAULT_RESOLVED_THEME)
  })

  it("handles throwing matchMedia gracefully", () => {
    const mockWindow = {
      matchMedia: () => {
        throw new Error("matchMedia crashed")
      },
    } as unknown as Window
    expect(getSystemThemePreference(mockWindow)).toBe(DEFAULT_RESOLVED_THEME)
  })
})

describe("Pure resolveTheme logic", () => {
  it("resolves explicit 'light' to 'light'", () => {
    expect(resolveTheme("light", "dark")).toBe("light")
    expect(resolveTheme("light", "light")).toBe("light")
  })

  it("resolves explicit 'dark' to 'dark'", () => {
    expect(resolveTheme("dark", "light")).toBe("dark")
    expect(resolveTheme("dark", "dark")).toBe("dark")
  })

  it("resolves 'system' dynamically based on system theme", () => {
    expect(resolveTheme("system", "dark")).toBe("dark")
    expect(resolveTheme("system", "light")).toBe("light")
  })

  it("falls back safely on corrupted preference inputs", () => {
    // @ts-expect-error test unknown
    expect(resolveTheme("unknown", "dark")).toBe(DEFAULT_RESOLVED_THEME)
  })
})

describe("applyThemeToElement DOM mutation helper", () => {
  it("returns false gracefully when element is null or undefined (SSR)", () => {
    expect(applyThemeToElement(null, "dark")).toBe(false)
    expect(applyThemeToElement(undefined, "light")).toBe(false)
  })

  it("correctly applies dark mode and color-scheme to element", () => {
    const classListSet = new Set<string>()
    const mockElement = {
      classList: {
        toggle: (className: string, force?: boolean) => {
          if (force) classListSet.add(className)
          else classListSet.delete(className)
          return force ?? false
        },
        contains: (className: string) => classListSet.has(className),
      },
      style: {
        colorScheme: "",
      },
      setAttribute: () => {},
    } as unknown as HTMLElement

    const result = applyThemeToElement(mockElement, "dark")
    expect(result).toBe(true)
    expect(classListSet.has(THEME_CLASS_DARK)).toBe(true)
    expect(mockElement.style.colorScheme).toBe("dark")
  })

  it("correctly applies light mode (removing dark class) and sets palette attribute", () => {
    const classListSet = new Set<string>([THEME_CLASS_DARK])
    const attributes = new Map<string, string>()

    const mockElement = {
      classList: {
        toggle: (className: string, force?: boolean) => {
          if (force) classListSet.add(className)
          else classListSet.delete(className)
          return force ?? false
        },
        contains: (className: string) => classListSet.has(className),
      },
      style: {
        colorScheme: "dark",
      },
      setAttribute: (name: string, val: string) => {
        attributes.set(name, val)
      },
    } as unknown as HTMLElement

    const result = applyThemeToElement(mockElement, "light", "amber")
    expect(result).toBe(true)
    expect(classListSet.has(THEME_CLASS_DARK)).toBe(false)
    expect(mockElement.style.colorScheme).toBe("light")
    expect(attributes.get(THEME_ATTR_PALETTE)).toBe("amber")
  })

  it("safely ignores invalid palette attribute without throwing", () => {
    const attributes = new Map<string, string>()
    const mockElement = {
      classList: { toggle: () => true },
      style: { colorScheme: "" },
      setAttribute: (name: string, val: string) => {
        attributes.set(name, val)
      },
    } as unknown as HTMLElement

    // @ts-expect-error test invalid palette
    applyThemeToElement(mockElement, "dark", "invalid-color-palette")
    expect(attributes.has(THEME_ATTR_PALETTE)).toBe(false)
  })

  it("safely normalizes invalid resolved theme value to fallback", () => {
    const mockElement = {
      classList: { toggle: () => true },
      style: { colorScheme: "" },
      setAttribute: () => {},
    } as unknown as HTMLElement

    // @ts-expect-error test invalid resolved value
    applyThemeToElement(mockElement, "corrupted-value")
    expect(mockElement.style.colorScheme).toBe(DEFAULT_RESOLVED_THEME)
  })

  it("handles throwing element methods gracefully", () => {
    const brokenElement = {
      classList: {
        toggle: () => {
          throw new Error("DOM mutation error")
        },
      },
      style: {},
    } as unknown as HTMLElement

    expect(applyThemeToElement(brokenElement, "dark")).toBe(false)
  })
})
