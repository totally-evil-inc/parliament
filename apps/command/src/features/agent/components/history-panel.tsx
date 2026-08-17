import { SparklesIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import type React from "react"
import { useState } from "react"
import {
  useConversations,
  useDeleteConversation,
} from "../hooks/use-agent-conversations"

interface HistoryPanelProps {
  currentThreadId?: string
  onSelectThread?: (threadId: string) => void
  onClose: () => void
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  currentThreadId,
  onSelectThread,
  onClose,
}) => {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const { data, isLoading } = useConversations()
  const deleteMutation = useDeleteConversation()

  const conversations = data?.conversations || []

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (id === currentThreadId) {
          navigate({ to: "/" })
        }
      },
    })
  }

  const handleSelect = (id: string) => {
    if (onSelectThread) {
      onSelectThread(id)
    } else {
      navigate({ to: "/$id", params: { id } })
    }
    onClose()
  }

  const handleNewChat = () => {
    navigate({ to: "/" })
    onClose()
  }

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-sm flex-col space-y-4 border-border border-l bg-card p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">
            Conversation History
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0"
          >
            <XMarkIcon className="size-3.5" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          className="flex h-9 w-full items-center justify-center gap-2 font-medium text-xs"
        >
          <SparklesIcon className="size-3.5" />
          <span>Start New Chat</span>
        </Button>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search threads..."
          className="h-8 text-xs"
        />

        <ScrollArea className="w-full flex-1 pr-1">
          <div className="space-y-1.5">
            {isLoading ? (
              <p className="py-4 text-center text-muted-foreground text-xs">
                Loading threads...
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-xs">
                No past conversations found.
              </p>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs transition-all ${
                    c.id === currentThreadId
                      ? "border-primary bg-primary/5 font-semibold text-foreground"
                      : "border-border bg-background text-foreground/90 hover:border-primary/40"
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="truncate font-medium">
                      {c.title || "Untitled Conversation"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(c.updatedAt).toLocaleDateString()} ·{" "}
                      {c.messageCount} msgs
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(e, c.id)}
                    disabled={deleteMutation.isPending}
                    className="h-6 w-6 p-0 text-muted-foreground text-xs hover:text-destructive"
                  >
                    <TrashIcon className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
