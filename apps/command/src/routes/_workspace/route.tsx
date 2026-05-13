import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { AppShell } from "@/layouts/app-shell"
import { getSession } from "@/server/auth"

export const Route = createFileRoute("/_workspace")({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: "/auth/sign-in" })
    }

    return { user: session.user }
  },
  component: WorkspaceRoute,
})

function WorkspaceRoute() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
