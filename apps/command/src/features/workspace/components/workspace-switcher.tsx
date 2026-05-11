import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import type { WorkspaceIdentity } from "@/features/workspace/config"

export function WorkspaceSwitcher({
  workspace,
}: {
  workspace: WorkspaceIdentity
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left transition-colors group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          />
        }
      >
        <span className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary text-[9px] font-medium text-sidebar-primary-foreground ring-1 ring-sidebar-border group-data-[collapsible=icon]:size-4">
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
      </TooltipTrigger>
      <TooltipContent side="right">{workspace.name}</TooltipContent>
    </Tooltip>
  )
}
