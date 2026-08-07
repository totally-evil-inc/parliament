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
                  <span className="ml-1 font-normal text-muted-foreground text-xs">
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
  const comingSoon = integration.status === "coming_soon"

  return (
    <Sheet>
      <SheetTrigger
        className="h-full w-full text-left"
        render={
          <Card
            className={cn(
              "flex min-h-56 cursor-pointer flex-col border-border/80 transition-all duration-200 hover:shadow-md",
              comingSoon && "bg-muted/10 opacity-90"
            )}
          />
        }
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-border/80 bg-background shadow-2xs">
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

        <CardContent className="flex flex-1 flex-col pt-1">
          <CardTitle className="font-semibold text-base">
            {integration.title}
          </CardTitle>
          <CardDescription className="mt-2 text-muted-foreground/90 text-sm leading-relaxed">
            {integration.description}
          </CardDescription>
        </CardContent>

        <CardFooter className="mt-auto justify-between gap-3 border-t pt-4 text-muted-foreground text-xs">
          <span className="font-medium capitalize">
            {integration.category.replace("-", " ")}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-foreground/70">
            {integration.actions.length} actions
            <IconArrowBoldRight className="size-3.5" />
          </span>
        </CardFooter>
      </SheetTrigger>

      <IntegrationSheet integration={integration} />
    </Sheet>
  )
}

function IntegrationSheet({ integration }: { integration: Integration }) {
  const connected = integration.status === "connected"
  const comingSoon = integration.status === "coming_soon"
  const connectMutation = useConnectIntegration()
  const disconnectMutation = useDisconnectIntegration()
  const isConnecting =
    connectMutation.isPending &&
    connectMutation.variables?.id === integration.id
  const isDisconnecting =
    disconnectMutation.isPending &&
    disconnectMutation.variables === integration.providerId
  const isPending = isConnecting || isDisconnecting

  const handleAction = () => {
    if (comingSoon) return
    if (connected) {
      disconnectMutation.mutate(integration.providerId)
    } else {
      connectMutation.mutate(integration)
    }
  }

  let buttonText = `Connect ${integration.title}`
  if (comingSoon) {
    buttonText = "Coming Soon"
  } else if (connected) {
    buttonText = isDisconnecting ? "Disconnecting..." : "Disconnect"
  } else if (isConnecting) {
    buttonText = "Redirecting..."
  }

  return (
    <SheetContent
      side="right"
      className="flex flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl"
    >
      <SheetHeader className="space-y-4 border-b bg-muted/20 px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background shadow-xs">
            <img
              alt=""
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(integration.url)}&sz=64`}
              className="size-7 rounded-md"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <SheetTitle className="font-semibold text-xl tracking-tight">
                {integration.title}
              </SheetTitle>
              <StatusBadge status={integration.status} />
            </div>
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              {integration.category.replace("-", " ")}
            </span>
          </div>
        </div>
        <SheetDescription className="pt-1 font-normal text-muted-foreground/90 text-sm leading-relaxed">
          {integration.longDescription}
        </SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-8 p-6 md:p-8">
          {/* Features Section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <IconBolt className="size-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                Key Features
              </h3>
            </div>
            <div className="grid gap-3">
              {integration.features.map((feature) => (
                <div
                  key={feature.label}
                  className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-border"
                >
                  <div className="flex items-center gap-2">
                    <IconCircleCheck className="size-4 shrink-0 text-emerald-500" />
                    <span className="font-medium text-foreground text-sm">
                      {feature.label}
                    </span>
                  </div>
                  <p className="pl-6 text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Agent Actions Section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <IconCodeEditor className="size-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                Agent Actions
              </h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              These are the tool calls the AI agent can invoke on your behalf
              when this integration is active:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {integration.actions.map((action) => (
                <Badge
                  key={action}
                  variant="outline"
                  className="rounded-md border-border/80 bg-background px-3 py-1 font-mono text-xs shadow-2xs"
                >
                  {action}
                </Badge>
              ))}
            </div>
          </section>

          {/* Scopes Section */}
          {integration.scopes && integration.scopes.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <IconGear className="size-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                  OAuth Scopes Requested
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {integration.scopes.map((scope) => (
                  <code
                    key={scope}
                    className="truncate rounded-md border border-border/40 bg-muted/60 px-3 py-2 font-mono text-muted-foreground text-xs leading-normal"
                  >
                    {scope}
                  </code>
                ))}
              </div>
            </section>
          )}

          {/* Gmail Activity Heatmap */}
          {integration.id === "gmail" && connected && <GmailActivityHeatmap />}
        </div>
      </ScrollArea>

      <SheetFooter className="border-t bg-background p-6">
        <Button
          type="button"
          variant={comingSoon ? "secondary" : connected ? "outline" : "default"}
          className="h-11 w-full font-medium text-sm"
          disabled={isPending || comingSoon}
          onClick={handleAction}
        >
          {comingSoon ? (
            "Coming Soon"
          ) : connected ? (
            <>
              <IconGear data-icon="inline-start" className="size-4" />
              {buttonText}
            </>
          ) : (
            <>
              <IconArrowBoldRight data-icon="inline-start" className="size-4" />
              {buttonText}
            </>
          )}
        </Button>
      </SheetFooter>
    </SheetContent>
  )
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const labels: Record<IntegrationStatus, string> = {
    connected: "Connected",
    available: "Available",
    pending: "Pending",
    coming_soon: "Coming Soon",
  }

  return (
    <Badge
      variant={status === "connected" ? "secondary" : "outline"}
      className={cn(
        "font-medium text-xs capitalize tracking-tight",
        status === "pending" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        status === "connected" &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        status === "available" &&
          "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        status === "coming_soon" &&
          "border-border bg-muted/60 text-muted-foreground"
      )}
    >
      {labels[status] ?? status}
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

function getIntegrationCounts(
  integrations: Array<Integration>
): Record<IntegrationFilter, number> {
  const initialCounts: Record<IntegrationFilter, number> = {
    all: integrations.length,
    connected: 0,
    available: 0,
    coming_soon: 0,
  }

  return integrations.reduce((counts, integration) => {
    if (integration.status in counts) {
      counts[integration.status as keyof typeof counts] += 1
    }
    return counts
  }, initialCounts)
}
