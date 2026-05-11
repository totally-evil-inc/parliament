import { Navigate, createFileRoute } from "@tanstack/react-router"
import { WorkspaceSettingsPlaceholder } from "@/features/workspace/components/workspace-settings-placeholder"
import {
  getWorkspaceSettingsTab,
  isWorkspaceSettingsParamTab,
} from "@/features/workspace/settings"

export const Route = createFileRoute("/_workspace/settings/$tab")({
  component: SettingsTabPage,
})

function SettingsTabPage() {
  const { tab } = Route.useParams()

  if (!isWorkspaceSettingsParamTab(tab)) {
    return <Navigate to="/settings" replace />
  }

  return <WorkspaceSettingsPlaceholder tab={getWorkspaceSettingsTab(tab)} />
}
