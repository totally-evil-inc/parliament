import { createFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"
import { CommandCenterPage } from "@/features/agent/components/command-center-page"
import { useCommandChatContext } from "@/features/agent/context/command-chat-context"

export const Route = createFileRoute("/_workspace/")({
  component: WorkspaceIndexPage,
})

function WorkspaceIndexPage() {
  const { threadId, resetNewChat, isLoading } = useCommandChatContext()

  useEffect(() => {
    if (threadId && !isLoading) {
      resetNewChat()
    }
  }, [threadId, isLoading, resetNewChat])

  return <CommandCenterPage />
}
