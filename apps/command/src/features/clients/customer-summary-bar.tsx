import { formatMoneyMinor } from "@workspace/document/calculate"
import type { CustomerAnalytics } from "@workspace/document/schema"
import {
  IconArrowBoldDown,
  IconArrowBoldUp,
  IconBolt,
  IconEyeClosed,
  IconSparkle4,
  IconTrophy,
} from "nucleo-glass"
import { useState } from "react"

type Props = {
  analytics: CustomerAnalytics
  isLoading?: boolean
}

export function CustomerSummaryBar({ analytics, isLoading }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (isLoading) {
    return (
      <div className="grid animate-pulse grid-cols-1 gap-4 rounded-xl border border-border bg-card/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-16 rounded-lg bg-muted/60" />
        <div className="h-16 rounded-lg bg-muted/60" />
        <div className="h-16 rounded-lg bg-muted/60" />
        <div className="h-16 rounded-lg bg-muted/60" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Client Performance Insights
        </span>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
        >
          <span>{isCollapsed ? "Show Summary" : "Hide Summary"}</span>
          {isCollapsed ? (
            <IconArrowBoldUp className="size-3" />
          ) : (
            <IconArrowBoldDown className="size-3" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Top Revenue Client */}
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <IconTrophy className="size-3.5 shrink-0 text-amber-500" />
              <span>Top Revenue Client</span>
            </span>
            <div className="mt-0.5 flex flex-col">
              <span className="truncate font-bold text-base text-foreground">
                {analytics.topRevenueClient?.name || "No data"}
              </span>
              <span className="font-mono font-semibold text-emerald-600 text-xs dark:text-emerald-400">
                {analytics.topRevenueClient
                  ? formatMoneyMinor(
                      analytics.topRevenueClient.revenueMinorUnits,
                      "USD",
                      "en-US"
                    )
                  : "$0.00"}
              </span>
            </div>
          </div>

          {/* Most Active Client */}
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <IconBolt className="size-3.5 shrink-0 text-purple-500" />
              <span>Most Active Client</span>
            </span>
            <div className="mt-0.5 flex flex-col">
              <span className="truncate font-bold text-base text-foreground">
                {analytics.mostActiveClient?.name || "No data"}
              </span>
              <span className="font-semibold text-purple-600 text-xs dark:text-purple-400">
                {analytics.mostActiveClient
                  ? `${analytics.mostActiveClient.proposalsCount} Proposals`
                  : "0 Proposals"}
              </span>
            </div>
          </div>

          {/* Inactive Clients */}
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <IconEyeClosed className="size-3.5 shrink-0 text-muted-foreground" />
              <span>Inactive Clients</span>
            </span>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="font-bold text-2xl text-foreground">
                {analytics.inactiveClientsCount}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Status: Inactive
              </span>
            </div>
          </div>

          {/* New Customers This Month */}
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <IconSparkle4 className="size-3.5 shrink-0 text-primary" />
              <span>New This Month</span>
            </span>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="font-bold text-2xl text-foreground">
                {analytics.newCustomersThisMonth}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Created 30d
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
