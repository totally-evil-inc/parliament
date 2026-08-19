import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import type React from "react"
import { useEffect, useState } from "react"
import type { ConversationSummary } from "../../hooks/use-agent-conversations"
import { useRenameConversation } from "../../hooks/use-agent-conversations"

interface HistoryRenameDialogProps {
  conversation: ConversationSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const HistoryRenameDialog: React.FC<HistoryRenameDialogProps> = ({
  conversation,
  open,
  onOpenChange,
}) => {
  const [title, setTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const renameMutation = useRenameConversation()

  useEffect(() => {
    if (conversation) {
      setTitle(conversation.title)
      setError(null)
    }
  }, [conversation])

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!conversation) return

    const trimmed = title.trim()
    if (!trimmed) {
      setError("Title cannot be empty")
      return
    }
    if (trimmed.length > 120) {
      setError("Title must be 120 characters or less")
      return
    }

    try {
      await renameMutation.mutateAsync({
        id: conversation.id,
        title: trimmed,
      })
      onOpenChange(false)
    } catch {
      // Handled via mutation onError toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>
              Enter a descriptive name for this conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g. Q3 Sales Proposal Discussion"
              maxLength={120}
              autoFocus
              className="h-9 text-xs"
              disabled={renameMutation.isPending}
            />
            {error ? (
              <p className="text-[11px] font-medium text-destructive">{error}</p>
            ) : (
              <div className="flex justify-end">
                <span className="text-[10px] text-muted-foreground">
                  {title.length}/120
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={renameMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                renameMutation.isPending ||
                !title.trim() ||
                title.trim() === conversation?.title
              }
            >
              {renameMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
