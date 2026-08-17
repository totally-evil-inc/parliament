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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-card/40"
          />
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
      ? Math.round(
          (analytics.conversionRate - analytics.previousConversionRate) * 10
        ) / 10
      : 0

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {/* 1. Pipeline Value */}
      <Card className="flex flex-col justify-between gap-3 border-border bg-card p-5 shadow-xs transition-colors hover:border-border/80">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Pipeline Value
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-bold font-mono text-2xl text-foreground tracking-tight">
            {formatMoneyMinor(analytics.totalPipelineValue, "USD", "en-US")}
          </span>
          <div className="flex items-center gap-1.5 font-semibold text-xs">
            {pipelineDiff >= 0 ? (
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                +{pipelineDiff}% ↑
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-rose-500">
                {pipelineDiff}% ↓
              </span>
            )}
            <span className="font-normal text-[11px] text-muted-foreground">
              vs last month
            </span>
          </div>
        </div>
      </Card>

      {/* 2. Lead-to-Deal Conversion Rate */}
      <Card className="flex flex-col justify-between gap-3 border-border bg-card p-5 shadow-xs transition-colors hover:border-border/80">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Lead-to-Deal Rate
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-bold font-mono text-2xl text-foreground tracking-tight">
            {analytics.conversionRate}%
          </span>
          <div className="flex items-center gap-1.5 font-semibold text-xs">
            {conversionDiff >= 0 ? (
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                +{conversionDiff}% ↑
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-rose-500">
                {conversionDiff}% ↓
              </span>
            )}
            <span className="font-normal text-[11px] text-muted-foreground">
              vs last month
            </span>
          </div>
        </div>
      </Card>

      {/* 3. Avg Deal Size */}
      <Card className="flex flex-col justify-between gap-3 border-border bg-card p-5 shadow-xs transition-colors hover:border-border/80">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Avg. Deal Size
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-bold font-mono text-2xl text-foreground tracking-tight">
            {formatMoneyMinor(analytics.avgDealSize, "USD", "en-US")}
          </span>
          <div className="flex items-center gap-1.5 font-semibold text-xs">
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
              Closed Won:{" "}
              {formatMoneyMinor(analytics.closedWonValue, "USD", "en-US")}
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Deals Closing This Month */}
      <Card className="flex flex-col justify-between gap-3 border-border bg-card p-5 shadow-xs transition-colors hover:border-border/80">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Closing This Month
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-bold font-mono text-2xl text-foreground tracking-tight">
            {analytics.dealsToCloseThisMonth}
          </span>
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
            <span>Targeting current billing cycle</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
