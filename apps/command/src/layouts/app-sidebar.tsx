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
  WorkspaceNavItem,
  WorkspaceUserProfile,
} from "@/features/workspace/config"
import { AccountMenu } from "./account-menu"
import { SidebarPrimaryNav } from "./sidebar-primary-nav"
import { SidebarSearch } from "./sidebar-search"
import { WorkspaceSwitcher } from "./workspace-switcher"

type AppSidebarProps = {
  primaryNav: Array<WorkspaceNavItem>
  user: WorkspaceUserProfile
  variant?: "sidebar" | "floating" | "inset"
}

export function AppSidebar({
  primaryNav,
  user,
  variant = "sidebar",
}: AppSidebarProps) {
  return (
    <Sidebar
      variant={variant}
      collapsible="icon"
      className="border-sidebar-border/80 border-r bg-sidebar"
    >
      <SidebarHeader className="gap-2 border-sidebar-border/80 border-b p-2">
        <WorkspaceSwitcher />
        <SidebarSearch />
      </SidebarHeader>

      <SidebarContent className="gap-1">
        <SidebarPrimaryNav items={primaryNav} />
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border/80 border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountMenu user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
