import { createFileRoute } from "@tanstack/react-router"
import { WorkspaceSettingsGeneral } from "@/features/workspace/components/workspace-settings-general"
import { WorkspaceSettingsPlaceholder } from "@/features/workspace/components/workspace-settings-placeholder"
import {
  defaultWorkspaceSettingsTab,
  getWorkspaceSettingsTab,
  isWorkspaceSettingsTab,
} from "@/features/workspace/settings"

export const Route = createFileRoute("/_workspace/settings/$tab")({
  params: {
    parse: (params) => {
      if (isWorkspaceSettingsTab(params.tab)) {
        return { tab: params.tab }
      }

      return { tab: defaultWorkspaceSettingsTab }
    },
  },
  component: SettingsTabPage,
})

function SettingsTabPage() {
  const { tab } = Route.useParams()

  if (tab === "general") {
    return <WorkspaceSettingsGeneral />
  }

  return <WorkspaceSettingsPlaceholder tab={getWorkspaceSettingsTab(tab)} />
}
