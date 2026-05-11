import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import type { ReactNode } from "react"
import { workspaceConfig } from "@/features/workspace/config"
import { AppSidebar } from "./app-sidebar"

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar
        workspace={workspaceConfig.workspace}
        workspaces={workspaceConfig.workspaces}
        primaryNav={workspaceConfig.primaryNav}
        user={workspaceConfig.user}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-4 md:hidden">
          <SidebarTrigger />
          <div className="min-w-0 flex-1 truncate text-sm font-medium">
            {workspaceConfig.workspace.name}
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
