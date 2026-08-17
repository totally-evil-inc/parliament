import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { PageHeader } from "@/components/page-header"
import { AppHeader } from "@/layouts/header-portal"
import { GmailActivityHeatmap } from "./components/gmail-activity-heatmap"
import { IntegrationPreviewCarousel } from "./components/integration-preview-carousel"
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
      <AppHeader />
      <PageHeader
        title="Integrations"
        description="Connect Parliament to external services managed by Better-Auth to enable AI Agent task execution across Gmail, Calendar, Drive, GitHub, Linear, and Notion."
      />

      <ScrollArea className="flex-1 min-h-0">
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
                  integrations={filterIntegrations(
                    integrations,
                    category.value
                  )}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </ScrollArea>
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
            <ArrowRightIcon className="size-3.5" />
          </span>
        </CardFooter>
      </SheetTrigger>

      <IntegrationSheet integration={integration} />
    </Sheet>
  )
}

function IntegrationSheet({ integration }: { integration: Integration }) {
  const confirm = useConfirm()
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

  const handleAction = async () => {
    if (comingSoon) return
    if (connected) {
      const ok = await confirm({
        title: `Disconnect ${integration.title}?`,
        description: `Are you sure you want to disconnect ${integration.title}? The AI Agent will no longer be able to perform automated operations on your behalf for this service.`,
        confirmLabel: "Disconnect Integration",
        cancelLabel: "Cancel",
        variant: "destructive",
      })
      if (ok) {
        disconnectMutation.mutate(integration.providerId)
      }
    } else {
      const ok = await confirm({
        title: `Connect ${integration.title}?`,
        description: `You are about to connect your ${integration.title} account using OAuth. Would you like to proceed?`,
        confirmLabel: "Connect Account",
        cancelLabel: "Cancel",
      })
      if (ok) {
        connectMutation.mutate(integration)
      }
    }
  }

  let buttonText = "Configure"
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
      showCloseButton={false}
      className="flex flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl"
    >
      {/* Top Header Control & Navigation Bar */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-1.5 font-medium text-xs">
          <span className="text-muted-foreground">Integrations</span>
          <span className="text-muted-foreground/60">/</span>
          <span className="font-semibold text-foreground tracking-tight">
            {integration.title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                />
              }
            >
              <EllipsisVerticalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(window.location.href)
                }
              >
                Copy Link
              </DropdownMenuItem>
              {integration.documentationUrl && (
                <DropdownMenuItem
                  onClick={() =>
                    window.open(integration.documentationUrl, "_blank")
                  }
                >
                  View Documentation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {integration.documentationUrl && (
            <a
              href={integration.documentationUrl}
              target="_blank"
              rel="noreferrer"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Open documentation"
            >
              <ArrowTopRightOnSquareIcon className="size-4" />
            </a>
          )}

          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              />
            }
          >
            <XMarkIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 py-6">
          {/* Main Hero Header */}
          <div className="flex items-start justify-between gap-4 px-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background shadow-xs">
                <img
                  alt=""
                  src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(integration.url)}&sz=64`}
                  className="size-8 rounded-md"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <h2 className="font-bold text-2xl text-foreground tracking-tight">
                  {integration.title}
                </h2>
                <span className="font-medium text-muted-foreground text-sm">
                  By {integration.author}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant={comingSoon ? "secondary" : "default"}
              className={cn(
                "h-9.5 rounded-xl px-4.5 font-semibold text-xs transition-all shadow-xs",
                !comingSoon &&
                  "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              )}
              disabled={isPending || comingSoon}
              onClick={handleAction}
            >
              <LinkIcon className="mr-1.5 size-3.5" />
              {buttonText}
            </Button>
          </div>

          {/* Badges Metadata */}
          <div className="flex flex-wrap items-center gap-2 px-6">
            <span className="rounded-md bg-muted/80 px-2.5 py-1 font-semibold text-[10px] text-muted-foreground tracking-wider uppercase">
              {integration.category.replace("-", " ")}
            </span>
            <span className="rounded-md bg-muted/80 px-2.5 py-1 font-semibold text-[10px] text-muted-foreground tracking-wider uppercase">
              {integration.actions.length} STEPS
            </span>
            <StatusBadge status={integration.status} />
          </div>

          {/* Short Description */}
          <p className="px-6 font-normal text-muted-foreground/90 text-sm leading-relaxed">
            {integration.description}
          </p>

          {/* Screenshots & Visual Preview Carousel */}
          {integration.previews && integration.previews.length > 0 && (
            <div className="px-6">
              <IntegrationPreviewCarousel previews={integration.previews} />
            </div>
          )}

          <div className="flex flex-col gap-8 px-6 pt-2">
            {/* Overview Section */}
            <section className="flex flex-col gap-2.5">
              <h3 className="font-semibold text-foreground text-sm tracking-tight">
                Overview
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {integration.overview ?? integration.longDescription}
                {(integration.documentationUrl || integration.url) && (
                  <a
                    href={integration.documentationUrl ?? integration.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 font-medium text-primary hover:underline"
                  >
                    Documentation.
                  </a>
                )}
              </p>
            </section>

            {/* How it works Section */}
            {integration.howItWorks && (
              <section className="flex flex-col gap-2.5">
                <h3 className="font-semibold text-foreground text-sm tracking-tight">
                  How it works
                </h3>
                <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
                  {integration.howItWorks
                    .split("\n\n")
                    .map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                </div>
              </section>
            )}

            {/* Key Features Section */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <BoltIcon className="size-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                  Key Features
                </h3>
              </div>
              <div className="grid gap-3">
                {integration.features.map((feature) => (
                  <div
                    key={feature.label}
                    className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-border"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
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
                <CodeBracketIcon className="size-4 text-primary" />
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

            {/* OAuth Scopes Requested Section */}
            {integration.scopes && integration.scopes.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Cog6ToothIcon className="size-4 text-primary" />
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
            {integration.id === "gmail" && connected && (
              <GmailActivityHeatmap />
            )}
          </div>
        </div>
      </ScrollArea>
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
