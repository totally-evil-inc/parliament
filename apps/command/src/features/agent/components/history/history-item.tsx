import { BookmarkIcon } from "@heroicons/react/20/solid"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import type { ConversationSummary } from "../../hooks/use-agent-conversations"
import { formatConversationDate } from "./date-grouping"
import { HistoryItemActions } from "./history-item-actions"

interface HistoryItemProps {
  conversation: ConversationSummary
  isActive: boolean
  currentThreadId?: string
  onSelect: (id: string) => void
  onStartRename: () => void
}

export const HistoryItem: React.FC<HistoryItemProps> = ({
  conversation,
  isActive,
  currentThreadId,
  onSelect,
  onStartRename,
}) => {
  const dateFormatted = formatConversationDate(conversation.updatedAt)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(conversation.id)
        }
      }}
      className={cn(
        "group/history-item relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-2 text-xs outline-none transition-colors",
        "focus-visible:ring-1 focus-visible:ring-sidebar-ring",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-xs"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      {/* Active Left Indicator Bar */}
      {isActive && (
        <span
          className="absolute top-2 bottom-2 left-0.5 w-1 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}

      {/* Main text content */}
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex items-center gap-1.5">
          {conversation.pinned && (
            <BookmarkIcon
              className="size-3 shrink-0 text-primary"
              aria-label="Pinned"
            />
          )}
          <p className="truncate leading-tight">
            {conversation.title || "Untitled Conversation"}
          </p>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-sidebar-foreground/50">
          <span>{dateFormatted}</span>
          <span>·</span>
          <span>
            {conversation.messageCount}{" "}
            {conversation.messageCount === 1 ? "msg" : "msgs"}
          </span>
          {conversation.model && (
            <>
              <span>·</span>
              <span className="max-w-[70px] truncate">
                {conversation.model.split("/").pop()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions dropdown trigger */}
      <div className="shrink-0">
        <HistoryItemActions
          conversation={conversation}
          currentThreadId={currentThreadId}
          onStartRename={onStartRename}
        />
      </div>
    </div>
  )
}
