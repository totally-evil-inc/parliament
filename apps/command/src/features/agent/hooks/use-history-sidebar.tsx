import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
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
  openMobile: boolean
  setOpenMobile: (value: boolean | ((prev: boolean) => boolean)) => void
  isMobile: boolean
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
  defaultOpenMobile = false,
}: {
  children?: React.ReactNode
  defaultOpen?: boolean
  defaultOpenMobile?: boolean
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = useState<boolean>(defaultOpenMobile)

  const [openDesktop, setOpenDesktopState] = useState<boolean>(() => {
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

  const setOpenDesktop = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setOpenDesktopState((prev) => {
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

  // Effective isOpen: on mobile it reflects openMobile (default false), on desktop it reflects openDesktop
  const isOpen = isMobile ? openMobile : openDesktop

  const setIsOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (isMobile) {
        setOpenMobile(value)
      } else {
        setOpenDesktop(value)
      }
    },
    [isMobile, setOpenDesktop]
  )

  const toggle = useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev)
    } else {
      setOpenDesktop((prev) => !prev)
    }
  }, [isMobile, setOpenDesktop])

  const openSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile(true)
    } else {
      setOpenDesktop(true)
    }
  }, [isMobile, setOpenDesktop])

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false)
    } else {
      setOpenDesktop(false)
    }
  }, [isMobile, setOpenDesktop])

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
      openMobile,
      setOpenMobile,
      isMobile,
      toggle,
      openSidebar,
      closeSidebar,
    }),
    [isOpen, setIsOpen, openMobile, isMobile, toggle, openSidebar, closeSidebar]
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
