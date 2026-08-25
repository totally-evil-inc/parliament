import { describe, expect, it } from "bun:test"
import {
  generateThemeBootstrapScript,
  THEME_BOOTSTRAP_SCRIPT,
} from "./bootstrap"
import {
  APP_PALETTE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  LEGACY_PALETTE_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  THEME_ATTR_PALETTE,
  THEME_CLASS_DARK,
} from "./constants"

// Helper to run the bootstrap script within an isolated mock sandbox
function executeBootstrapInMock(mockContext: {
  document: {
    documentElement?: {
      classList?: {
        toggle: (cls: string, force?: boolean) => boolean
        contains: (cls: string) => boolean
      }
      style?: {
        colorScheme?: string
      }
      setAttribute?: (name: string, value: string) => void
    } | null
  }
  window: {
    localStorage?: Storage | null
    matchMedia?: ((query: string) => { matches: boolean }) | null
  }
}) {
  const runner = new Function("window", "document", THEME_BOOTSTRAP_SCRIPT)
  runner(mockContext.window, mockContext.document)
}

describe("Theme Bootstrap Script Generator", () => {
  it("generates a valid, non-empty, self-contained IIFE script string", () => {
    const script = generateThemeBootstrapScript()
    expect(script).toBeString()
    expect(script.startsWith("(function(){")).toBe(true)
    expect(script.endsWith("})();")).toBe(true)
    expect(THEME_BOOTSTRAP_SCRIPT).toBe(script)
  })

  it("applies dark mode and primary palette when explicit stored settings exist", () => {
    const classSet = new Set<string>()
    const attributes = new Map<string, string>()
    const style: { colorScheme?: string } = {}

    const mockDoc = {
      documentElement: {
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) classSet.add(cls)
            else classSet.delete(cls)
            return force ?? false
          },
          contains: (cls: string) => classSet.has(cls),
        },
        style,
        setAttribute: (k: string, v: string) => attributes.set(k, v),
      },
    }

    const mockWin = {
      localStorage: {
        getItem: (key: string) => {
          if (key === APP_THEME_STORAGE_KEY) return "dark"
          if (key === APP_PALETTE_STORAGE_KEY) return "amber"
          return null
        },
      } as unknown as Storage,
      matchMedia: () => ({ matches: false }),
    }

    executeBootstrapInMock({ document: mockDoc, window: mockWin })

    expect(classSet.has(THEME_CLASS_DARK)).toBe(true)
    expect(style.colorScheme).toBe("dark")
    expect(attributes.get(THEME_ATTR_PALETTE)).toBe("amber")
  })

  it("applies light mode when explicit stored theme is 'light'", () => {
    const classSet = new Set<string>([THEME_CLASS_DARK])
    const style: { colorScheme?: string } = { colorScheme: "dark" }

    const mockDoc = {
      documentElement: {
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) classSet.add(cls)
            else classSet.delete(cls)
            return force ?? false
          },
          contains: (cls: string) => classSet.has(cls),
        },
        style,
        setAttribute: () => {},
      },
    }

    const mockWin = {
      localStorage: {
        getItem: (key: string) =>
          key === APP_THEME_STORAGE_KEY ? "light" : null,
      } as unknown as Storage,
      matchMedia: () => ({ matches: true }), // OS is dark, but user explicitly chose light
    }

    executeBootstrapInMock({ document: mockDoc, window: mockWin })

    expect(classSet.has(THEME_CLASS_DARK)).toBe(false)
    expect(style.colorScheme).toBe("light")
  })

  it("resolves system preference dynamically when theme is 'system'", () => {
    const classSet = new Set<string>()
    const style: { colorScheme?: string } = {}

    const mockDoc = {
      documentElement: {
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) classSet.add(cls)
            else classSet.delete(cls)
            return force ?? false
          },
          contains: (cls: string) => classSet.has(cls),
        },
        style,
        setAttribute: () => {},
      },
    }

    const mockWin = {
      localStorage: {
        getItem: (key: string) =>
          key === APP_THEME_STORAGE_KEY ? "system" : null,
      } as unknown as Storage,
      matchMedia: (q: string) => ({ matches: q.includes("dark") }),
    }

    executeBootstrapInMock({ document: mockDoc, window: mockWin })

    expect(classSet.has(THEME_CLASS_DARK)).toBe(true)
    expect(style.colorScheme).toBe("dark")
  })

  it("gives primary keys precedence over legacy keys when both exist", () => {
    const classSet = new Set<string>()
    const attributes = new Map<string, string>()
    const style: { colorScheme?: string } = {}

    const mockDoc = {
      documentElement: {
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) classSet.add(cls)
            else classSet.delete(cls)
            return force ?? false
          },
          contains: (cls: string) => classSet.has(cls),
        },
        style,
        setAttribute: (k: string, v: string) => attributes.set(k, v),
      },
    }

    const mockWin = {
      localStorage: {
        getItem: (key: string) => {
          if (key === APP_THEME_STORAGE_KEY) return "light"
          if (key === LEGACY_THEME_STORAGE_KEY) return "dark"
          if (key === APP_PALETTE_STORAGE_KEY) return "indigo"
          if (key === LEGACY_PALETTE_STORAGE_KEY) return "crimson"
          return null
        },
      } as unknown as Storage,
    }

    executeBootstrapInMock({ document: mockDoc, window: mockWin })

    expect(classSet.has(THEME_CLASS_DARK)).toBe(false)
    expect(style.colorScheme).toBe("light")
    expect(attributes.get(THEME_ATTR_PALETTE)).toBe("indigo")
  })

  it("reads legacy theme and palette keys if primary keys are not present", () => {
    const classSet = new Set<string>()
    const attributes = new Map<string, string>()
    const style: { colorScheme?: string } = {}

    const mockDoc = {
      documentElement: {
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) classSet.add(cls)
            else classSet.delete(cls)
            return force ?? false
          },
          contains: (cls: string) => classSet.has(cls),
        },
        style,
        setAttribute: (k: string, v: string) => attributes.set(k, v),
      },
    }

    const mockWin = {
      localStorage: {
        getItem: (key: string) => {
          if (key === LEGACY_THEME_STORAGE_KEY) return "dark"
          if (key === LEGACY_PALETTE_STORAGE_KEY) return "violet"
          return null
        },
      } as unknown as Storage,
    }

    executeBootstrapInMock({ document: mockDoc, window: mockWin })

    expect(classSet.has(THEME_CLASS_DARK)).toBe(true)
    expect(style.colorScheme).toBe("dark")
    expect(attributes.get(THEME_ATTR_PALETTE)).toBe("violet")
  })

  it("handles corrupted or invalid storage values by falling back safely", () => {
    const classSet = new Set<string>()
    const attributes = new Map<string, string>()
    const style: { colorScheme?: string } = {}

    const mockDoc = {
      documentElement: {
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) classSet.add(cls)
            else classSet.delete(cls)
            return force ?? false
          },
          contains: (cls: string) => classSet.has(cls),
        },
        style,
        setAttribute: (k: string, v: string) => attributes.set(k, v),
      },
    }

    const mockWin = {
      localStorage: {
        getItem: (key: string) => {
          if (key === APP_THEME_STORAGE_KEY) return "invalid_theme_value"
          if (key === APP_PALETTE_STORAGE_KEY) return "neon_pink_unknown"
          return null
        },
      } as unknown as Storage,
      matchMedia: () => ({ matches: false }),
    }

    executeBootstrapInMock({ document: mockDoc, window: mockWin })

    // Invalid theme falls back to system -> OS is light -> not dark
    expect(classSet.has(THEME_CLASS_DARK)).toBe(false)
    expect(style.colorScheme).toBe("light")
    // Invalid palette should NOT set attribute
    expect(attributes.has(THEME_ATTR_PALETTE)).toBe(false)
  })

  it("handles missing matchMedia when theme is system without throwing", () => {
    const classSet = new Set<string>()
    const style: { colorScheme?: string } = {}

    const mockDoc = {
      documentElement: {
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) classSet.add(cls)
            else classSet.delete(cls)
            return force ?? false
          },
          contains: (cls: string) => classSet.has(cls),
        },
        style,
        setAttribute: () => {},
      },
    }

    const mockWin = {
      localStorage: {
        getItem: () => "system",
      } as unknown as Storage,
      // matchMedia is missing / not defined
    }

    executeBootstrapInMock({ document: mockDoc, window: mockWin })

    expect(classSet.has(THEME_CLASS_DARK)).toBe(false)
    expect(style.colorScheme).toBe("light")
  })

  it("handles partial DOM element without classList or style without throwing", () => {
    const mockDoc = {
      documentElement: {
        // No classList, no style, no setAttribute
      },
    }

    const mockWin = {
      localStorage: {
        getItem: () => "dark",
      } as unknown as Storage,
    }

    expect(() => {
      executeBootstrapInMock({ document: mockDoc, window: mockWin })
    }).not.toThrow()
  })

  it("handles throwing storage or matchMedia without throwing an uncaught exception", () => {
    const mockDoc = {
      documentElement: {
        classList: {
          toggle: () => true,
          contains: () => false,
        },
        style: {},
        setAttribute: () => {},
      },
    }

    const mockWin = {
      get localStorage(): Storage {
        throw new Error("SecurityError: Access Denied")
      },
      matchMedia: () => {
        throw new Error("matchMedia error")
      },
    }

    expect(() => {
      executeBootstrapInMock({ document: mockDoc, window: mockWin })
    }).not.toThrow()
  })

  it("gracefully exits if document.documentElement is null", () => {
    const mockDoc = { documentElement: null }
    const mockWin = { localStorage: null }

    expect(() => {
      executeBootstrapInMock({ document: mockDoc, window: mockWin })
    }).not.toThrow()
  })
})
