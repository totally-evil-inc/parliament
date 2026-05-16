import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { AppShell } from "@/layouts/app-shell"
import { getViewer } from "@/server/auth"

export const Route = createFileRoute("/_workspace")({
  beforeLoad: async () => {
    const viewer = await getViewer()
    if (!viewer) {
      throw redirect({ to: "/auth/sign-in" })
    }

    return { user: viewer.user }
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
