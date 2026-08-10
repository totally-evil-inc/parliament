import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
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
        description="A typed workspace shell with route-aware navigation, deal pipeline tracking, and live proposal management."
        action={
          <div className="flex items-center gap-2">
            <Button type="button" render={<Link to="/clients/deals" />}>
              Deals Pipeline →
            </Button>
          </div>
        }
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
