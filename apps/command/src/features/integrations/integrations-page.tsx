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
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import {
  IconArrowBoldRight,
  IconBolt,
  IconCircleCheck,
  IconCodeEditor,
  IconGear,
} from "nucleo-glass"
import * as React from "react"
import { PageHeader } from "@/components/page-header"
import { GmailActivityHeatmap } from "./components/gmail-activity-heatmap"
import type { Integration, IntegrationStatus } from "./data"
import { integrationCategories } from "./data"
import {
  useConnectIntegration,
  useDisconnectIntegration,
} from "./use-integrations"

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
        description="Connect Parliament to external services managed by Better-Auth to enable AI Agent task execution across Gmail, Calendar, Drive, GitHub, Linear, and Notion."
      />

      <div className="flex flex-1 flex-col gap-5 p-6 md:p-8">
        <Tabs defaultValue="all" className="gap-5">
          <div className="flex items-center justify-between gap-3">
            <TabsList variant="line">
              {integrationCategories.map((category) => (
                <TabsTrigger key={category.value} value={category.value}>
                  {category.label}
                  <span className="ml-1 text-muted-foreground text-xs">
                    ({counts[category.value] ?? 0})
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
  return (
    <Sheet>
      <SheetTrigger
        className="text-left"
        render={
          <Card className="min-h-56 cursor-pointer transition-shadow duration-150 hover:shadow-md" />
        }
      >
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

        <CardFooter className="mt-auto justify-between gap-3 border-t pt-4">
          <span className="text-muted-foreground text-xs capitalize">
            {integration.category.replace("-", " ")}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            {integration.actions.length} actions
            <IconArrowBoldRight className="size-3" />
          </span>
        </CardFooter>
      </SheetTrigger>

      <IntegrationSheet integration={integration} />
    </Sheet>
  )
}

function IntegrationSheet({ integration }: { integration: Integration }) {
  const connected = integration.status === "connected"
  const connectMutation = useConnectIntegration()
  const disconnectMutation = useDisconnectIntegration()
  const isPending = connectMutation.isPending || disconnectMutation.isPending

  const handleAction = () => {
    if (connected) {
      disconnectMutation.mutate(integration.providerId)
    } else {
      connectMutation.mutate(integration)
    }
  }

  return (
    <SheetContent side="right" className="flex flex-col sm:max-w-lg">
      <SheetHeader className="border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background">
            <img
              alt=""
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(integration.url)}&sz=64`}
              className="size-6 rounded-sm"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <SheetTitle>{integration.title}</SheetTitle>
              <StatusBadge status={integration.status} />
            </div>
            <span className="text-muted-foreground text-xs capitalize">
              {integration.category.replace("-", " ")}
            </span>
          </div>
        </div>
        <SheetDescription className="mt-3 text-sm/relaxed">
          {integration.longDescription}
        </SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {/* Features Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconBolt className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Features</h3>
          </div>
          <ul className="flex flex-col gap-3">
            {integration.features.map((feature) => (
              <li key={feature.label} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <IconCircleCheck className="size-3.5 shrink-0 text-emerald-500" />
                  <span className="font-medium text-sm">{feature.label}</span>
                </div>
                <p className="pl-5 text-muted-foreground text-xs/relaxed">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Actions Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconCodeEditor className="size-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Agent Actions</h3>
          </div>
          <p className="text-muted-foreground text-xs/relaxed">
            These are the tool calls the AI agent can invoke on your behalf when
            this integration is connected.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {integration.actions.map((action) => (
              <Badge
                key={action}
                variant="outline"
                className="font-mono text-xs"
              >
                {action}
              </Badge>
            ))}
          </div>
        </section>

        {/* Scopes Section */}
        {integration.scopes && integration.scopes.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <IconGear className="size-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">OAuth Scopes Requested</h3>
            </div>
            <div className="flex flex-col gap-1">
              {integration.scopes.map((scope) => (
                <code
                  key={scope}
                  className="truncate rounded bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs"
                >
                  {scope}
                </code>
              ))}
            </div>
          </section>
        )}

        {/* Gmail Activity Heatmap */}
        {integration.id === "gmail" && connected && <GmailActivityHeatmap />}
      </ScrollArea>

      <SheetFooter className="border-t">
        <Button
          type="button"
          variant={connected ? "outline" : "default"}
          className="w-full"
          disabled={isPending}
          onClick={handleAction}
        >
          {connected ? (
            <>
              <IconGear data-icon="inline-start" />
              {isPending ? "Disconnecting..." : "Disconnect"}
            </>
          ) : (
            <>
              <IconArrowBoldRight data-icon="inline-start" />
              {isPending ? "Redirecting..." : `Connect ${integration.title}`}
            </>
          )}
        </Button>
      </SheetFooter>
    </SheetContent>
  )
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  return (
    <Badge
      variant={status === "connected" ? "secondary" : "outline"}
      className={cn(
        status === "pending" && "border-amber-500/30 text-amber-700",
        status === "connected" &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
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
      if (integration.status in counts) {
        counts[integration.status] += 1
      }
      return counts
    },
    {
      all: 0,
      connected: 0,
      available: 0,
    } as Record<string, number>
  )
}
