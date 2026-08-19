import { useNavigate, useRouterState } from "@tanstack/react-router"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useMemo, useState } from "react"
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

interface HistorySidebarProps {
  className?: string
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  className,
}) => {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  // Extract active thread ID from pathname: e.g. "/$id" -> id
  const currentThreadId = useMemo(() => {
    if (!pathname || pathname === "/" || pathname.startsWith("/clients") || pathname.startsWith("/proposals") || pathname.startsWith("/invoices") || pathname.startsWith("/integrations") || pathname.startsWith("/settings")) {
      return undefined
    }
    const parts = pathname.split("/").filter(Boolean)
    return parts.length === 1 ? parts[0] : undefined
  }, [pathname])

  const { isOpen, closeSidebar } = useHistorySidebar()
  const [search, setSearch] = useState("")
  const [editingConversation, setEditingConversation] =
    useState<ConversationSummary | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)

  const { data, isLoading, isError } = useConversations()
  const rawConversations = data?.conversations || []

  // Filter conversations by search term
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rawConversations
    return rawConversations.filter((c) =>
      c.title.toLowerCase().includes(query)
    )
  }, [rawConversations, search])

  // Group filtered conversations into Pinned, Today, Yesterday, etc.
  const groups = useMemo(() => {
    return groupConversations(filtered)
  }, [filtered])

  const handleSelect = (id: string) => {
    navigate({ to: "/$id", params: { id } })
  }

  const handleNewChat = () => {
    navigate({ to: "/" })
  }

  const handleStartRename = (conversation: ConversationSummary) => {
    setEditingConversation(conversation)
    setRenameDialogOpen(true)
  }

  return (
    <>
      <aside
        data-state={isOpen ? "open" : "closed"}
        aria-label="Conversation History"
        className={cn(
          "dark relative z-20 flex h-svh shrink-0 flex-col bg-transparent text-sidebar-foreground transition-[width,min-width,max-width,padding,opacity] duration-200 ease-in-out",
          isOpen
            ? "w-72 min-w-[18rem] max-w-[18rem] opacity-100 md:p-2 md:pl-0"
            : "w-0 min-w-0 max-w-0 border-none p-0 opacity-0 overflow-hidden pointer-events-none",
          className
        )}
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-sidebar ring-1 ring-sidebar-border shadow-sm">
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
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <HistorySkeleton />
                ) : isError ? (
                  <div className="px-4 py-8 text-center text-xs text-destructive">
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
        </div>
      </aside>

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
