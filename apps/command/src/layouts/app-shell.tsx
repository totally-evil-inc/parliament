import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import type { ReactNode } from "react"
import { HistorySidebarProvider } from "@/features/agent/hooks/use-history-sidebar"
import { workspaceConfig } from "@/features/workspace/config"
import { authClient } from "@/lib/auth-client"
import { AppSidebar } from "./app-sidebar"
import { HeaderProvider, HeaderSlot } from "./header-portal"
import { WorkspaceProvider } from "./workspace-provider"

type AppShellProps = {
  children: ReactNode
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join("")
    .toUpperCase()
}

export function AppShell({ children }: AppShellProps) {
  const session = authClient.useSession()
  const userName = session.data?.user.name ?? "User"
  const userEmail = session.data?.user.email ?? ""

  const user = {
    name: userName,
    email: userEmail,
    initials: getInitials(userName),
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <WorkspaceProvider>
        <HeaderProvider>
          <HistorySidebarProvider defaultOpen={false}>
            <AppSidebar
              variant="floating"
              primaryNav={workspaceConfig.primaryNav}
              user={user}
            />
            <SidebarInset className="flex h-svh min-w-0 flex-col overflow-hidden">
              <HeaderSlot />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
                {children}
              </div>
            </SidebarInset>
          </HistorySidebarProvider>
        </HeaderProvider>
      </WorkspaceProvider>
    </SidebarProvider>
  )
}
