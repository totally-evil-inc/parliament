import { formatMoneyMinor } from "@workspace/document/calculate"
import { Card } from "@workspace/ui/components/card"

type Props = {
  analytics: {
    totalPipelineValue: number
    closedWonValue: number
    conversionRate: number
    avgDealSize: number
    dealsToCloseThisMonth: number
    previousPipelineValue: number
    previousConversionRate: number
  }
  isLoading?: boolean
}

export function DealKpiCards({ analytics, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card/40 animate-pulse" />
        ))}
      </div>
    )
  }

  // Calculate percentage changes
  const pipelineDiff =
    analytics.previousPipelineValue > 0
      ? Math.round(
          ((analytics.totalPipelineValue - analytics.previousPipelineValue) /
            analytics.previousPipelineValue) *
            1000
        ) / 10
      : 0

  const conversionDiff =
    analytics.previousConversionRate > 0
      ? Math.round((analytics.conversionRate - analytics.previousConversionRate) * 10) / 10
      : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 1. Pipeline Value */}
      <Card className="p-5 flex flex-col justify-between gap-3 bg-card border-border shadow-xs hover:border-border/80 transition-colors">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Pipeline Value
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {formatMoneyMinor(analytics.totalPipelineValue, "USD", "en-US")}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {pipelineDiff >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                +{pipelineDiff}% ↑
              </span>
            ) : (
              <span className="text-rose-500 flex items-center gap-0.5">
                {pipelineDiff}% ↓
              </span>
            )}
            <span className="text-muted-foreground text-[11px] font-normal">vs last month</span>
          </div>
        </div>
      </Card>

      {/* 2. Lead-to-Deal Conversion Rate */}
      <Card className="p-5 flex flex-col justify-between gap-3 bg-card border-border shadow-xs hover:border-border/80 transition-colors">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Lead-to-Deal Rate
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {analytics.conversionRate}%
          </span>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {conversionDiff >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                +{conversionDiff}% ↑
              </span>
            ) : (
              <span className="text-rose-500 flex items-center gap-0.5">
                {conversionDiff}% ↓
              </span>
            )}
            <span className="text-muted-foreground text-[11px] font-normal">vs last month</span>
          </div>
        </div>
      </Card>

      {/* 3. Avg Deal Size */}
      <Card className="p-5 flex flex-col justify-between gap-3 bg-card border-border shadow-xs hover:border-border/80 transition-colors">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Avg. Deal Size
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {formatMoneyMinor(analytics.avgDealSize, "USD", "en-US")}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              Closed Won: {formatMoneyMinor(analytics.closedWonValue, "USD", "en-US")}
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Deals Closing This Month */}
      <Card className="p-5 flex flex-col justify-between gap-3 bg-card border-border shadow-xs hover:border-border/80 transition-colors">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Closing This Month
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {analytics.dealsToCloseThisMonth}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Targeting current billing cycle</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
