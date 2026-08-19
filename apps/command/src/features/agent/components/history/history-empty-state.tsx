import { MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/outline"
import { Button } from "@workspace/ui/components/button"
import type React from "react"

interface HistoryEmptyStateProps {
  isSearching: boolean
  searchQuery: string
  onClearSearch: () => void
  onNewChat: () => void
}

export const HistoryEmptyState: React.FC<HistoryEmptyStateProps> = ({
  isSearching,
  searchQuery,
  onClearSearch,
  onNewChat,
}) => {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent/50 text-sidebar-foreground/50">
          <MagnifyingGlassIcon className="size-5" />
        </div>
        <p className="mt-3 font-medium text-sidebar-foreground text-xs">
          No matches found
        </p>
        <p className="mt-1 max-w-[200px] text-[11px] text-sidebar-foreground/50 leading-relaxed">
          No conversations match "{searchQuery}"
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSearch}
          className="mt-4 h-7 text-xs"
        >
          Clear Search
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SparklesIcon className="size-5" />
      </div>
      <p className="mt-3 font-medium text-sidebar-foreground text-xs">
        No conversation history
      </p>
      <p className="mt-1 max-w-[200px] text-[11px] text-sidebar-foreground/50 leading-relaxed">
        Start a new chat to begin asking questions and executing commands.
      </p>
      <Button
        size="sm"
        onClick={onNewChat}
        className="mt-4 flex h-8 items-center gap-1.5 text-xs"
      >
        <SparklesIcon className="size-3.5" />
        <span>New Chat</span>
      </Button>
    </div>
  )
}
