import { Outlet, createFileRoute } from "@tanstack/react-router"
import { WorkspaceLayout } from "@/features/workspace/components/workspace-layout"

export const Route = createFileRoute("/_workspace")({
  component: WorkspaceRoute,
})

function WorkspaceRoute() {
  return (
    <WorkspaceLayout>
      <Outlet />
    </WorkspaceLayout>
  )
}
