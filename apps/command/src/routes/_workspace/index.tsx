import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { testQuery } from "@/api/workspace"
import { MetricCard } from "@/components/metric-card"
import { PageHeader } from "@/components/page-header"
import { workspaceStats } from "@/features/workspace/config"

export const Route = createFileRoute("/_workspace/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(testQuery)
  },
  component: HomePage,
})

function HomePage() {
  const { data: testResponse } = useSuspenseQuery(testQuery)

  return (
    <>
      <PageHeader
        title="Command center"
        description="A typed workspace shell with route-aware navigation, static seed data, and room for live organization data when the product needs it."
        action={<Button type="button">Create project</Button>}
      />

      <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
        {workspaceStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="px-6 pb-6 md:px-8 md:pb-8">
        <pre className="overflow-auto rounded-md border bg-muted p-4 text-sm">
          {JSON.stringify(testResponse, null, 2)}
        </pre>
      </div>
    </>
  )
}
