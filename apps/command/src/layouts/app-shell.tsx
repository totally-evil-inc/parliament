import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import { Link, useRouterState } from "@tanstack/react-router"
import type { ReactNode } from "react"
import * as React from "react"
import { authClient } from "@/lib/auth-client"
import { workspaceConfig } from "@/features/workspace/config"
import { AppSidebar } from "./app-sidebar"

type AppShellProps = {
  children: ReactNode
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase()
}

export function AppShell({ children }: AppShellProps) {
  const session = authClient.useSession()
  const userName = (session.data?.user.name as string | undefined) ?? "User"
  const userEmail = (session.data?.user.email as string | undefined) ?? ""

  const user = {
    name: userName,
    email: userEmail,
    initials: getInitials(userName),
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar
        variant="inset"
        primaryNav={workspaceConfig.primaryNav}
        user={user}
      />
      <SidebarInset className="flex h-svh min-w-0 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumbs />
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <main className="flex min-h-full flex-col bg-background text-foreground">
            {children}
          </main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}

function Breadcrumbs() {
  const routerState = useRouterState()
  const pathnames = routerState.location.pathname
    .split("/")
    .filter((x) => x && x !== "_workspace")

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
            <React.Fragment key={to}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={to} />}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
