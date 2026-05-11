import { SidebarMenuButton } from "@workspace/ui/components/sidebar"
import type { WorkspaceUserProfile } from "@/features/workspace/config"

export function WorkspaceUser({ user }: { user: WorkspaceUserProfile }) {
  return (
    <SidebarMenuButton type="button" tooltip={user.name}>
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-sidebar-foreground text-[9px] font-medium text-sidebar">
        {user.initials}
      </span>
      <span className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <span className="truncate text-sm font-medium">{user.name}</span>
        <span className="flex items-center gap-1.5 truncate text-xs text-sidebar-foreground/60">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {user.status}
        </span>
      </span>
    </SidebarMenuButton>
  )
}
