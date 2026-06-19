import * as React from "react"
import {
  ArrowUpRightIcon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import { integrationCategories } from "./data"
import type { Integration, IntegrationStatus } from "./data"
import { PageHeader } from "@/components/page-header"

type IntegrationFilter = (typeof integrationCategories)[number]["value"]

type IntegrationsPageProps = {
  integrations: Array<Integration>
}

export function IntegrationsPage({ integrations }: IntegrationsPageProps) {
  const counts = React.useMemo(
    () => getIntegrationCounts(integrations),
    [integrations]
  )

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect Parliament to the tools your workspace already uses for analytics, publishing, payments, and automation."
      />

      <div className="flex flex-1 flex-col gap-5 p-6 md:p-8">
        <Tabs defaultValue="all" className="gap-5">
          <div className="flex items-center justify-between gap-3">
            <TabsList variant="line">
              {integrationCategories.map((category) => (
                <TabsTrigger key={category.value} value={category.value}>
                  {category.label}
                  <span className="text-muted-foreground">
                    {counts[category.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {integrationCategories.map((category) => (
            <TabsContent key={category.value} value={category.value}>
              <IntegrationGrid
                integrations={filterIntegrations(integrations, category.value)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  )
}

function IntegrationGrid({
  integrations,
}: {
  integrations: Array<Integration>
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {integrations.map((integration) => (
        <IntegrationCard key={integration.id} integration={integration} />
      ))}
    </div>
  )
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const connected = integration.status === "connected"

  return (
    <Card className="min-h-56">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-md border border-border/80 bg-background">
          <img
            alt=""
            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(integration.url)}&sz=64`}
            className="size-6 rounded-sm"
          />
        </div>
        <CardAction>
          <StatusBadge status={integration.status} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <CardTitle>{integration.title}</CardTitle>
        <CardDescription className="mt-2">
          {integration.description}
        </CardDescription>
      </CardContent>

      <CardFooter className="mt-auto justify-between gap-3 border-t">
        <span className="text-xs text-muted-foreground capitalize">
          {integration.category}
        </span>
        <Button
          type="button"
          variant={connected ? "secondary" : "default"}
          size="sm"
        >
          {connected ? (
            <>
              Manage
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                data-icon="inline-end"
              />
            </>
          ) : (
            <>
              Connect
              <HugeiconsIcon icon={ArrowUpRightIcon} data-icon="inline-end" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  return (
    <Badge
      variant={status === "connected" ? "secondary" : "outline"}
      className={cn(
        status === "pending" && "border-amber-500/30 text-amber-700",
        status === "connected" && "text-emerald-700"
      )}
    >
      {status}
    </Badge>
  )
}

function filterIntegrations(
  integrations: Array<Integration>,
  filter: IntegrationFilter
) {
  if (filter === "all") {
    return integrations
  }

  return integrations.filter((integration) => integration.status === filter)
}

function getIntegrationCounts(integrations: Array<Integration>) {
  return integrations.reduce(
    (counts, integration) => {
      counts.all += 1
      counts[integration.status] += 1
      return counts
    },
    {
      all: 0,
      connected: 0,
      available: 0,
      pending: 0,
    } satisfies Record<IntegrationFilter, number>
  )
}
