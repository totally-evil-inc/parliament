import { createFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"
import { CommandCenterPage } from "@/features/agent/components/command-center-page"
import { useCommandChatContext } from "@/features/agent/context/command-chat-context"

export const Route = createFileRoute("/_workspace/$id")({
  component: CommandCenterPageWithId,
})

function CommandCenterPageWithId() {
  const { id } = Route.useParams()
  const { loadThread, isCurrentThread } = useCommandChatContext()

  useEffect(() => {
    if (id && !isCurrentThread(id)) {
      loadThread(id)
    }
  }, [id, loadThread, isCurrentThread])

  return <CommandCenterPage />
}
