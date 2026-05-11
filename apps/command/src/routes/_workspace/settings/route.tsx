import {
  Link,
  Outlet,
  createFileRoute,
  useParams,
} from "@tanstack/react-router"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { WorkspaceSettingsProvider } from "@/features/workspace/components/workspace-settings-context"
import { WorkspacePageHeader } from "@/features/workspace/components/workspace-page-header"
import {
  defaultWorkspaceSettingsTab,
  isWorkspaceSettingsTab,
  workspaceSettingsTabs,
} from "@/features/workspace/settings"

export const Route = createFileRoute("/_workspace/settings")({
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <WorkspaceSettingsProvider>
      <div className="min-h-svh bg-background text-foreground">
        <WorkspacePageHeader
          eyebrow="Settings"
          title="Workspace settings"
          description="Manage workspace identity, account access, billing, and developer keys."
        />
        <div className="grid min-h-[calc(100svh-7rem)] md:grid-cols-[180px_minmax(0,1fr)]">
          <WorkspaceSettingsTabs />
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </WorkspaceSettingsProvider>
  )
}

function WorkspaceSettingsTabs() {
  const params = useParams({ strict: false })
  const activeTab = isWorkspaceSettingsTab(params.tab)
    ? params.tab
    : defaultWorkspaceSettingsTab

  return (
    <Tabs
      value={activeTab}
      orientation="vertical"
      className="border-b border-border/60 px-6 py-4 md:border-r md:border-b-0 md:px-4"
    >
      <TabsList variant="line" className="w-full">
        {workspaceSettingsTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            render={
              <Link
                to="/settings/$tab"
                params={{ tab: tab.value }}
                preload="intent"
              />
            }
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
