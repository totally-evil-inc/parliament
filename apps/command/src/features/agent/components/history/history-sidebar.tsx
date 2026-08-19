import { useNavigate } from "@tanstack/react-router"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useMemo, useState } from "react"
import { useCommandChatContext } from "../../context/command-chat-context"
import type { ConversationSummary } from "../../hooks/use-agent-conversations"
import { useConversations } from "../../hooks/use-agent-conversations"
import { useHistorySidebar } from "../../hooks/use-history-sidebar"
import { groupConversations } from "./date-grouping"
import { HistoryEmptyState } from "./history-empty-state"
import { HistoryGroup } from "./history-group"
import { HistoryHeader } from "./history-header"
import { HistoryItem } from "./history-item"
import { HistoryRenameDialog } from "./history-rename-dialog"
import { HistorySkeleton } from "./history-skeleton"

const EMPTY_CONVERSATIONS: ConversationSummary[] = []

interface HistorySidebarProps {
  className?: string
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  className,
}) => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { threadId: currentThreadId } = useCommandChatContext()
  const { isOpen, setIsOpen, closeSidebar } = useHistorySidebar()

  const [search, setSearch] = useState("")
  const [editingConversation, setEditingConversation] =
    useState<ConversationSummary | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)

  const { data, isLoading, isError } = useConversations()
  const rawConversations = data?.conversations ?? EMPTY_CONVERSATIONS

  // Filter conversations by search term (rerender-memo)
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rawConversations
    return rawConversations.filter((c) => c.title.toLowerCase().includes(query))
  }, [rawConversations, search])

  // Group filtered conversations into Pinned, Today, Yesterday, etc. (rerender-memo)
  const groups = useMemo(() => {
    return groupConversations(filtered)
  }, [filtered])

  const handleSelect = (id: string) => {
    navigate({ to: "/$id", params: { id } })
    if (isMobile) {
      closeSidebar()
    }
  }

  const handleNewChat = () => {
    navigate({ to: "/" })
    if (isMobile) {
      closeSidebar()
    }
  }

  const handleStartRename = (conversation: ConversationSummary) => {
    setEditingConversation(conversation)
    setRenameDialogOpen(true)
  }

  const historyContent = (
    <>
      {/* Top Header & Search */}
      <HistoryHeader
        search={search}
        onSearchChange={setSearch}
        onNewChat={handleNewChat}
        onClose={closeSidebar}
      />

      {/* Scrollable Conversation List */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="space-y-1 p-2">
            {isLoading ? (
              <HistorySkeleton />
            ) : isError ? (
              <div className="px-4 py-8 text-center text-destructive text-xs">
                <p>Failed to load conversations.</p>
              </div>
            ) : filtered.length === 0 ? (
              <HistoryEmptyState
                isSearching={Boolean(search.trim())}
                searchQuery={search.trim()}
                onClearSearch={() => setSearch("")}
                onNewChat={handleNewChat}
              />
            ) : (
              groups.map((group) => (
                <HistoryGroup
                  key={group.label}
                  label={group.label}
                  count={group.conversations.length}
                >
                  {group.conversations.map((conv) => (
                    <HistoryItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === currentThreadId}
                      currentThreadId={currentThreadId}
                      onSelect={handleSelect}
                      onStartRename={() => handleStartRename(conv)}
                    />
                  ))}
                </HistoryGroup>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )

  return (
    <>
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent
            side="left"
            className="dark w-72 bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Conversation History</SheetTitle>
              <SheetDescription>
                Browse and select past conversations
              </SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col overflow-hidden">
              {historyContent}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <aside
          data-state={isOpen ? "open" : "closed"}
          aria-label="Conversation History"
          className={cn(
            "dark relative z-20 hidden h-full shrink-0 flex-col bg-transparent text-sidebar-foreground transition-[width,min-width,max-width,padding,opacity] duration-200 ease-in-out md:flex",
            isOpen
              ? "w-72 min-w-[18rem] max-w-[18rem] opacity-100 md:p-2 md:pl-0"
              : "pointer-events-none w-0 min-w-0 max-w-0 overflow-hidden border-none p-0 opacity-0",
            className
          )}
        >
          <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-sidebar shadow-sm ring-1 ring-sidebar-border">
            {historyContent}
          </div>
        </aside>
      )}

      {/* Modal Rename Dialog */}
      <HistoryRenameDialog
        conversation={editingConversation}
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open)
          if (!open) setEditingConversation(null)
        }}
      />
    </>
  )
}
