import { useState } from "react"
import { formatMoneyMinor } from "@workspace/document/calculate"
import type { CustomerAnalytics } from "@workspace/document/schema"

type Props = {
  analytics: CustomerAnalytics
  isLoading?: boolean
}

export function CustomerSummaryBar({ analytics, isLoading }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-card/50 animate-pulse">
        <div className="h-16 bg-muted/60 rounded-lg" />
        <div className="h-16 bg-muted/60 rounded-lg" />
        <div className="h-16 bg-muted/60 rounded-lg" />
        <div className="h-16 bg-muted/60 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Client Performance Insights
        </span>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          {isCollapsed ? "Show Summary ▲" : "Hide Summary ▼"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Top Revenue Client */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              🏆 Top Revenue Client
            </span>
            <div className="flex flex-col mt-0.5">
              <span className="text-base font-bold text-foreground truncate">
                {analytics.topRevenueClient?.name || "No data"}
              </span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {analytics.topRevenueClient
                  ? formatMoneyMinor(analytics.topRevenueClient.revenueMinorUnits, "USD", "en-US")
                  : "$0.00"}
              </span>
            </div>
          </div>

          {/* Most Active Client */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              ⚡ Most Active Client
            </span>
            <div className="flex flex-col mt-0.5">
              <span className="text-base font-bold text-foreground truncate">
                {analytics.mostActiveClient?.name || "No data"}
              </span>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                {analytics.mostActiveClient
                  ? `${analytics.mostActiveClient.proposalsCount} Proposals`
                  : "0 Proposals"}
              </span>
            </div>
          </div>

          {/* Inactive Clients */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              💤 Inactive Clients
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-2xl font-bold text-foreground">
                {analytics.inactiveClientsCount}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Status: Inactive
              </span>
            </div>
          </div>

          {/* New Customers This Month */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              ✨ New This Month
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-2xl font-bold text-foreground">
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
