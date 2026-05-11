import { createFileRoute } from "@tanstack/react-router"
import { WorkspacePageHeader } from "@/features/workspace/components/workspace-page-header"

export const Route = createFileRoute("/_workspace/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <WorkspacePageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage workspace preferences, members, and account-level defaults."
      />
    </div>
  )
}
