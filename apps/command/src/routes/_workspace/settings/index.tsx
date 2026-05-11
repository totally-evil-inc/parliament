import { createFileRoute } from "@tanstack/react-router"
import { WorkspaceSettingsGeneral } from "@/features/workspace/components/workspace-settings-general"

export const Route = createFileRoute("/_workspace/settings/")({
  component: WorkspaceSettingsGeneral,
})
