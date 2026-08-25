import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { IconMagnifier } from "nucleo-glass"

export function SidebarSearch() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="Quick find"
            className="flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 text-left text-sidebar-foreground/70 text-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
          />
        }
      >
        <IconMagnifier className="size-3.5" />
        <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
          Quick find...
        </span>
        <kbd className="rounded border border-sidebar-border bg-sidebar-accent/60 px-1 font-mono text-[9px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          ⌘K
        </kbd>
      </TooltipTrigger>
      <TooltipContent side="right">Quick find</TooltipContent>
    </Tooltip>
  )
}
