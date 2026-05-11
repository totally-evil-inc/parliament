import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { SidebarMenuButton } from "@workspace/ui/components/sidebar"
import type { WorkspaceUserProfile } from "@/features/workspace/config"

export function WorkspaceUser({ user }: { user: WorkspaceUserProfile }) {
  return (
    <SidebarMenuButton
      type="button"
      tooltip={user.name}
      className="h-12 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-1!"
    >
      <Avatar className="group-data-[collapsible=icon]:size-6">
        <AvatarFallback className="bg-sidebar-foreground text-[10px] font-medium text-sidebar">
          {user.initials}
        </AvatarFallback>
      </Avatar>
      <span className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <span className="truncate text-sm font-medium">{user.name}</span>
        <span className="truncate text-xs text-sidebar-foreground/60">
          {user.email}
        </span>
      </span>
    </SidebarMenuButton>
  )
}
