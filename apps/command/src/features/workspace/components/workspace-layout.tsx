import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import type { ReactNode } from "react"
import { workspaceConfig } from "@/features/workspace/config"
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar"

type WorkspaceLayoutProps = {
  children: ReactNode
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <WorkspaceSidebar
        workspace={workspaceConfig.workspace}
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
