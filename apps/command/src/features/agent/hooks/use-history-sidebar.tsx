import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

const HISTORY_SIDEBAR_STORAGE_KEY = "parliament_history_sidebar_open"

interface HistorySidebarContextValue {
  isOpen: boolean
  setIsOpen: (value: boolean | ((prev: boolean) => boolean)) => void
  toggle: () => void
  openSidebar: () => void
  closeSidebar: () => void
}

const HistorySidebarContext = createContext<HistorySidebarContextValue | null>(
  null
)

export function HistorySidebarProvider({
  children,
  defaultOpen = true,
}: {
  children?: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen
    try {
      const stored = localStorage.getItem(HISTORY_SIDEBAR_STORAGE_KEY)
      if (stored !== null) {
        return stored === "true"
      }
      return defaultOpen
    } catch {
      return defaultOpen
    }
  })

  const setIsOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setIsOpenState((prev) => {
        const next = typeof value === "function" ? value(prev) : value
        try {
          localStorage.setItem(HISTORY_SIDEBAR_STORAGE_KEY, String(next))
        } catch {
          // Ignore localStorage quota / access errors in private mode
        }
        return next
      })
    },
    []
  )

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [setIsOpen])

  const openSidebar = useCallback(() => {
    setIsOpen(true)
  }, [setIsOpen])

  const closeSidebar = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  // Global keyboard shortcut: Cmd+Shift+H (Mac) / Ctrl+Shift+H (Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === "h" || e.key === "H")
      ) {
        e.preventDefault()
        toggle()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggle])

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggle,
      openSidebar,
      closeSidebar,
    }),
    [isOpen, setIsOpen, toggle, openSidebar, closeSidebar]
  )

  return (
    <HistorySidebarContext.Provider value={value}>
      {children}
    </HistorySidebarContext.Provider>
  )
}

export function useHistorySidebar(): HistorySidebarContextValue {
  const context = useContext(HistorySidebarContext)
  if (!context) {
    throw new Error(
      "useHistorySidebar must be used within a HistorySidebarProvider"
    )
  }
  return context
}
