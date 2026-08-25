import {
  BookmarkIcon,
  BookmarkSlashIcon,
  ClipboardDocumentIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { toast } from "@workspace/ui/components/sonner"
import type React from "react"
import { useConfirm } from "@/components/confirm-dialog-provider"
import type { ConversationSummary } from "../../hooks/use-agent-conversations"
import {
  useDeleteConversation,
  useTogglePinConversation,
} from "../../hooks/use-agent-conversations"

interface HistoryItemActionsProps {
  conversation: ConversationSummary
  currentThreadId?: string
  onStartRename: () => void
}

export const HistoryItemActions: React.FC<HistoryItemActionsProps> = ({
  conversation,
  currentThreadId,
  onStartRename,
}) => {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const togglePinMutation = useTogglePinConversation()
  const deleteMutation = useDeleteConversation()

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    togglePinMutation.mutate({
      id: conversation.id,
      pinned: !conversation.pinned,
    })
  }

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const url = `${window.location.origin}/${conversation.id}`
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = await confirm({
      title: "Delete conversation?",
      description: `Are you sure you want to delete "${conversation.title || "Untitled Conversation"}"? This will permanently delete this conversation and all its messages. This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    })

    if (!confirmed) return

    deleteMutation.mutate(conversation.id, {
      onSuccess: () => {
        if (conversation.id === currentThreadId) {
          navigate({ to: "/" })
        }
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label="Conversation actions"
            className="h-6 w-6 rounded-md p-0 text-sidebar-foreground/60 opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-foreground group-hover/history-item:opacity-100 group-focus-within/history-item:opacity-100 data-[state=open]:opacity-100"
          >
            <EllipsisHorizontalIcon className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={4}
        className="w-44"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleTogglePin}>
            {conversation.pinned ? (
              <>
                <BookmarkSlashIcon className="size-3.5" />
                <span>Unpin</span>
              </>
            ) : (
              <>
                <BookmarkIcon className="size-3.5" />
                <span>Pin to top</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onStartRename()
            }}
          >
            <PencilSquareIcon className="size-3.5" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <ClipboardDocumentIcon className="size-3.5" />
            <span>Copy link</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <TrashIcon className="size-3.5" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
