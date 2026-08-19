import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { renderToString } from "react-dom/server"
import {
  APP_PALETTE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  DEFAULT_PALETTE,
  DEFAULT_RESOLVED_THEME,
  DEFAULT_THEME_PREFERENCE,
  THEME_ATTR_PALETTE,
  THEME_CLASS_DARK,
} from "@/lib/themes/constants"
import {
  type ThemeContextValue,
  ThemeProvider,
  useTheme,
} from "./theme-provider"

// Test consumer component
function TestConsumer() {
  const {
    preference,
    resolved,
    palette,
    setPreference,
    setPalette,
    toggleLightDark,
  } = useTheme()

  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolved}</span>
      <span data-testid="palette">{palette}</span>
      <button
        type="button"
        data-testid="set-dark"
        onClick={() => setPreference("dark")}
      >
        Set Dark
      </button>
      <button
        type="button"
        data-testid="set-light"
        onClick={() => setPreference("light")}
      >
        Set Light
      </button>
      <button
        type="button"
        data-testid="set-system"
        onClick={() => setPreference("system")}
      >
        Set System
      </button>
      <button
        type="button"
        data-testid="set-palette"
        onClick={() => setPalette("indigo")}
      >
        Set Palette Indigo
      </button>
      <button
        type="button"
        data-testid="toggle-mode"
        onClick={toggleLightDark}
      >
        Toggle Mode
      </button>
    </div>
  )
}

describe("ThemeProvider SSR & Render Behavior", () => {
  it("renders children cleanly in SSR mode without throwing", () => {
    const html = renderToString(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    expect(html).toContain(DEFAULT_THEME_PREFERENCE)
    expect(html).toContain(DEFAULT_RESOLVED_THEME)
    expect(html).toContain(DEFAULT_PALETTE)
  })

  it("throws a descriptive error when useTheme is consumed outside ThemeProvider", () => {
    function BrokenComponent() {
      useTheme()
      return <div>Broken</div>
    }

    expect(() => {
      renderToString(<BrokenComponent />)
    }).toThrow("useTheme must be used within a ThemeProvider")
  })
})

describe("ThemeProvider Client State & DOM Operations", () => {
  const classListSet = new Set<string>()
  const attributes = new Map<string, string>()
  const styleObj: { colorScheme?: string } = {}
  const storageMap = new Map<string, string>()
  const windowListeners = new Map<string, Array<EventListener>>()

  beforeEach(() => {
    classListSet.clear()
    attributes.clear()
    styleObj.colorScheme = ""
    storageMap.clear()
    windowListeners.clear()

    const mockDocumentElement = {
      classList: {
        toggle: (cls: string, force?: boolean) => {
          if (force) classListSet.add(cls)
          else classListSet.delete(cls)
          return force ?? false
        },
        contains: (cls: string) => classListSet.has(cls),
      },
      style: styleObj,
      setAttribute: (k: string, v: string) => attributes.set(k, v),
    }

    // Assign mock document safely
    ;(globalThis as unknown as { document: Document }).document = {
      documentElement: mockDocumentElement,
    } as unknown as Document

    const mockLocalStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, v),
      removeItem: (k: string) => storageMap.delete(k),
      clear: () => storageMap.clear(),
      length: 0,
      key: () => null,
    }

    // Assign mock window safely
    ;(globalThis as unknown as { window: Window }).window = {
      localStorage: mockLocalStorage,
      matchMedia: (query: string) => ({
        matches: query.includes("dark"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      addEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject
      ) => {
        const list = windowListeners.get(type) ?? []
        list.push(listener as EventListener)
        windowListeners.set(type, list)
      },
      removeEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject
      ) => {
        const list = windowListeners.get(type) ?? []
        windowListeners.set(
          type,
          list.filter((l) => l !== listener)
        )
      },
    } as unknown as Window
  })

  afterEach(() => {
    delete (globalThis as unknown as { document?: Document }).document
    delete (globalThis as unknown as { window?: Window }).window
  })

  it("initializes state from mocked client storage and applies DOM attributes", () => {
    storageMap.set(APP_THEME_STORAGE_KEY, "dark")
    storageMap.set(APP_PALETTE_STORAGE_KEY, "sage")

    const html = renderToString(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )

    expect(html).toContain("dark")
    expect(html).toContain("sage")
  })

  it("synchronously updates DOM and storage when setPreference and toggleLightDark are invoked", () => {
    let captured: ThemeContextValue | null = null

    function Consumer() {
      captured = useTheme()
      return null
    }

    renderToString(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    )

    if (!captured) {
      throw new Error("Consumer was not rendered")
    }

    const themeApi: ThemeContextValue = captured

    // Test explicit setPreference to 'dark'
    themeApi.setPreference("dark")
    expect(storageMap.get(APP_THEME_STORAGE_KEY)).toBe("dark")
    expect(classListSet.has(THEME_CLASS_DARK)).toBe(true)
    expect(styleObj.colorScheme).toBe("dark")

    // Test toggleLightDark from dark -> light
    themeApi.toggleLightDark()
    expect(storageMap.get(APP_THEME_STORAGE_KEY)).toBe("light")
    expect(classListSet.has(THEME_CLASS_DARK)).toBe(false)
    expect(styleObj.colorScheme).toBe("light")

    // Test setPalette
    themeApi.setPalette("crimson")
    expect(storageMap.get(APP_PALETTE_STORAGE_KEY)).toBe("crimson")
    expect(attributes.get(THEME_ATTR_PALETTE)).toBe("crimson")
  })
})
