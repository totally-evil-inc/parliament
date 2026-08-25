import {
  ClockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import type React from "react"

interface HistoryHeaderProps {
  search: string
  onSearchChange: (value: string) => void
  onNewChat: () => void
  onClose: () => void
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  search,
  onSearchChange,
  onNewChat,
  onClose,
}) => {
  return (
    <div className="flex flex-col gap-2.5 border-sidebar-border/80 border-b p-3">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-foreground/80">
            <ClockIcon className="size-3.5" />
          </div>
          <span className="font-semibold text-sidebar-foreground text-xs">
            History
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onNewChat}
                  aria-label="Start new chat"
                  className="size-7 rounded-md p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <PlusIcon className="size-4" />
                </Button>
              }
            />
            <TooltipContent side="bottom" align="center">
              New chat
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Collapse history sidebar"
                  className="size-7 rounded-md p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <XMarkIcon className="size-4" />
                </Button>
              }
            />
            <TooltipContent side="bottom" align="center">
              Close history (Cmd+Shift+H)
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Search Input with Clear Button */}
      <div className="relative flex items-center">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 size-3.5 text-sidebar-foreground/40" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search history..."
          className="h-8 border-sidebar-border bg-sidebar-accent/50 pr-7 pl-8 text-sidebar-foreground text-xs placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-ring"
        />
        {search.length > 0 && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-2 flex size-4 items-center justify-center rounded-full text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <XMarkIcon className="size-3" />
          </button>
        )}
      </div>
    </div>
  )
}
