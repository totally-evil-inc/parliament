import { Add01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@workspace/ui/components/button"
import type { WorkspaceIdentity } from "@/features/workspace/config"

export function WorkspaceSwitcher({
  workspace,
  workspaces,
}: {
  workspace: WorkspaceIdentity
  workspaces: Array<WorkspaceIdentity>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-12 w-full items-center gap-2 rounded-md px-2 text-left transition-colors group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Switch workspace"
          />
        }
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground ring-1 ring-sidebar-border group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:rounded-sm group-data-[collapsible=icon]:text-[9px]">
          {workspace.name.slice(0, 1)}
        </span>
        <span className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-medium">{workspace.name}</span>
          <span className="truncate font-mono text-[10px] tracking-[0.2em] text-sidebar-foreground/60 uppercase">
            {workspace.plan} · {workspace.members} members
          </span>
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-3.5 opacity-60 group-data-[collapsible=icon]:hidden"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        className="w-64"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((item) => (
            <DropdownMenuItem key={item.name} className="min-h-10">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                {item.name.slice(0, 1)}
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium">{item.name}</span>
                <span className="truncate text-[0.6875rem] text-muted-foreground">
                  {item.plan} · {item.members} members
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Button variant="ghost" className="w-full justify-start" />}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
