import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { workspaceStats } from "@/features/workspace/config"
import { WorkspacePageHeader } from "@/features/workspace/components/workspace-page-header"
import { WorkspaceStat } from "@/features/workspace/components/workspace-stat"

export const Route = createFileRoute("/_workspace/")({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <WorkspacePageHeader
        eyebrow="Home"
        title="Command center"
        description="A typed workspace shell with route-aware navigation, static seed data, and room for live organization data when the product needs it."
        action={<Button type="button">Create project</Button>}
      />

      <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
        {workspaceStats.map((stat) => (
          <WorkspaceStat key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  )
}
