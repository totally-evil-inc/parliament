import { createFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"
import { CommandCenterPage } from "@/features/agent/components/command-center-page"
import { useCommandChatContext } from "@/features/agent/context/command-chat-context"
import { conversationDetailQueryOptions } from "@/features/agent/hooks/use-agent-conversations"

export const Route = createFileRoute("/_workspace/$id")({
  loader: async ({ params, context }) => {
    // Prefetch thread details via TanStack Router loader to eliminate client-side waterfalls (async-route-prefetch)
    if (context?.queryClient && params?.id) {
      try {
        await context.queryClient.ensureQueryData(
          conversationDetailQueryOptions(params.id)
        )
      } catch {
        // Fallback to in-component client hydration if loader prefetch encounters network error
      }
    }
  },
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
