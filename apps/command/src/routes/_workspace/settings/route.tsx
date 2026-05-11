import {
  Link,
  Outlet,
  createFileRoute,
  useParams,
} from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"
import { SettingsProvider } from "@/features/workspace/settings/settings-provider"
import { PageHeader } from "@/components/page-header"
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
    <SettingsProvider>
      <PageHeader
        title="Workspace settings"
        description="Manage workspace identity, account access, billing, and developer keys."
      />
      <div className="grid min-h-[calc(100svh-7rem)] md:grid-cols-[180px_minmax(0,1fr)]">
        <SettingsTabs />
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </SettingsProvider>
  )
}

function SettingsTabs() {
  const params = useParams({ strict: false })
  const activeTab = isWorkspaceSettingsTab(params.tab)
    ? params.tab
    : defaultWorkspaceSettingsTab

  return (
    <nav
      aria-label="Settings sections"
      className="border-b border-border/60 px-6 py-4 md:border-r md:border-b-0 md:px-4"
    >
      <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {workspaceSettingsTabs.map((tab) => (
          <Link
            key={tab.value}
            to={tab.to}
            params={
              tab.value === defaultWorkspaceSettingsTab
                ? undefined
                : { tab: tab.value }
            }
            preload="intent"
            className={cn(
              "relative inline-flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium whitespace-nowrap text-foreground/60 transition-colors hover:text-foreground md:w-full",
              activeTab === tab.value &&
                "bg-background text-foreground after:absolute after:inset-y-1 after:-right-4 after:hidden after:w-0.5 after:bg-foreground md:after:block"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
