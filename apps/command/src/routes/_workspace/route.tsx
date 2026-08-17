import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { CommandChatProvider } from "@/features/agent/context/command-chat-context"
import { AppShell } from "@/layouts/app-shell"
import { getSession, getViewer } from "@/server/auth"

export const Route = createFileRoute("/_workspace")({
  beforeLoad: async () => {
    const viewer = await getViewer()
    if (!viewer) {
      throw redirect({ to: "/auth/sign-in" })
    }

    const session = await getSession()
    if (!session?.session?.activeOrganizationId) {
      throw redirect({
        to: "/auth/onboarding",
        search: { step: "organization" },
      })
    }

    return { user: viewer.user }
  },
  component: WorkspaceRoute,
})

function WorkspaceRoute() {
  return (
    <CommandChatProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </CommandChatProvider>
  )
}
