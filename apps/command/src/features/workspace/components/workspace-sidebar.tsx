import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import type {
  WorkspaceIdentity,
  WorkspaceNavItem,
  WorkspaceUserProfile,
} from "@/features/workspace/config"
import { PrimaryNav } from "@/features/workspace/components/primary-nav"
import { WorkspaceSearch } from "@/features/workspace/components/workspace-search"
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher"
import { WorkspaceUser } from "@/features/workspace/components/workspace-user"

type WorkspaceSidebarProps = {
  workspace: WorkspaceIdentity
  workspaces: Array<WorkspaceIdentity>
  primaryNav: Array<WorkspaceNavItem>
  user: WorkspaceUserProfile
}

export function WorkspaceSidebar({
  workspace,
  workspaces,
  primaryNav,
  user,
}: WorkspaceSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/80 bg-sidebar"
    >
      <SidebarHeader className="gap-2 border-b border-sidebar-border/80 p-2">
        <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} />
        <WorkspaceSearch />
      </SidebarHeader>

      <SidebarContent className="gap-1">
        <PrimaryNav items={primaryNav} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <WorkspaceUser user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
