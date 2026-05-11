import { Outlet, createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/layouts/app-shell"

export const Route = createFileRoute("/_workspace")({
  component: WorkspaceRoute,
})

function WorkspaceRoute() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
