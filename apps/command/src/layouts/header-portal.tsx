import { Link, useRouterState } from "@tanstack/react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import type { ReactNode } from "react"
import {
  createContext,
  Fragment,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react"

interface HeaderContextValue {
  headerContent: ReactNode | null
  setHeaderContent: (content: ReactNode | null) => void
}

const HeaderContext = createContext<HeaderContextValue | null>(null)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null)

  const value = useMemo(
    () => ({
      headerContent,
      setHeaderContent,
    }),
    [headerContent]
  )

  return (
    <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>
  )
}

export function useHeader() {
  const context = useContext(HeaderContext)
  if (!context) {
    throw new Error("useHeader must be used within a HeaderProvider")
  }
  return context
}

export function HeaderPortal({ children }: { children: React.ReactNode }) {
  const { setHeaderContent } = useHeader()

  useLayoutEffect(() => {
    setHeaderContent(children)
    return () => {
      setHeaderContent(null)
    }
  }, [children, setHeaderContent])

  return null
}

export function HeaderSlot({ className }: { className?: string }) {
  const { headerContent } = useHeader()
  if (!headerContent) return null
  return <div className={className}>{headerContent}</div>
}

export interface AppHeaderProps {
  title?: string
  breadcrumbs?: React.ReactNode
  children?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function AppHeader({
  title,
  breadcrumbs,
  children,
  actions,
  className,
}: AppHeaderProps) {
  return (
    <HeaderPortal>
      <header
        className={cn(
          "flex h-12 shrink-0 items-center justify-between gap-2 border-border/60 border-b bg-background px-4",
          className
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {breadcrumbs ?? <Breadcrumbs title={title} />}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : (
          children
        )}
      </header>
    </HeaderPortal>
  )
}

export function Breadcrumbs({ title }: { title?: string }) {
  const routerState = useRouterState()
  const pathnames = routerState.location.pathname
    .split("/")
    .filter((x) => x && x !== "_workspace")

  if (title) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/" />}>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  if (pathnames.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/" />}>Home</BreadcrumbLink>
        </BreadcrumbItem>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1
          const to = `/${pathnames.slice(0, index + 1).join("/")}`
          const label =
            value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ")

          return (
            <Fragment key={to}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={to} />}>
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
