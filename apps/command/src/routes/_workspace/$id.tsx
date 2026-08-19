import { createFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"
import { CommandCenterPage } from "@/features/agent/components/command-center-page"
import { useCommandChatContext } from "@/features/agent/context/command-chat-context"

const AUTH_SERVER_URL =
  import.meta.env.VITE_AUTH_SERVER_URL ||
  import.meta.env.VITE_BETTER_AUTH_URL ||
  "http://localhost:4000"

export const Route = createFileRoute("/_workspace/$id")({
  loader: async ({ params, context }) => {
    // Prefetch thread details via TanStack Router loader to eliminate client-side waterfalls (async-route-prefetch)
    if (context?.queryClient && params?.id) {
      try {
        await context.queryClient.ensureQueryData({
          queryKey: ["agent", "conversations", params.id],
          queryFn: async () => {
            const res = await fetch(
              `${AUTH_SERVER_URL}/api/agent/conversations/${params.id}`,
              { credentials: "include" }
            )
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
          },
          staleTime: 60_000,
        })
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
