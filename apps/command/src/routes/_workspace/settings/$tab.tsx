import { Navigate, createFileRoute } from "@tanstack/react-router"
import { SettingsPlaceholder } from "@/features/workspace/settings/settings-placeholder"
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

  return <SettingsPlaceholder tab={getWorkspaceSettingsTab(tab)} />
}
