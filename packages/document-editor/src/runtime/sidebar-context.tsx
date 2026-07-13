import * as React from "react"

type DocumentSidebarContextType = {
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
}

const DocumentSidebarContext = React.createContext<DocumentSidebarContextType | undefined>(undefined)

export function DocumentSidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [openMobile, setOpenMobile] = React.useState(false)

  const toggleSidebar = React.useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [open, openMobile, toggleSidebar]
  )

  return (
    <DocumentSidebarContext.Provider value={value}>
      {children}
    </DocumentSidebarContext.Provider>
  )
}

export function useDocumentSidebar() {
  const context = React.useContext(DocumentSidebarContext)
  if (!context) {
    throw new Error("useDocumentSidebar must be used within a DocumentSidebarProvider")
  }
  return context
}
