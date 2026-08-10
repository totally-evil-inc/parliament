import { formatMoneyMinor } from "@workspace/document/calculate"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

type Props = {
  stageData: Array<{
    stage: string
    count: number
    value: number
  }>
}

const STAGE_CONFIG: Record<string, { label: string; badgeBg: string; barBg: string }> = {
  lead: { label: "Lead / Incoming", badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", barBg: "bg-blue-500" },
  discovery: { label: "Discovery", badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", barBg: "bg-amber-500" },
  proposal_sent: { label: "Proposal Sent", badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", barBg: "bg-purple-500" },
  negotiation: { label: "Negotiation", badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", barBg: "bg-indigo-500" },
  closed_won: { label: "Closed Won", badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", barBg: "bg-emerald-500" },
  closed_lost: { label: "Closed Lost", badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", barBg: "bg-rose-500" },
}

export function DealStageBreakdown({ stageData }: Props) {
  const totalValue = stageData.reduce((sum, s) => sum + s.value, 0)

  return (
    <Card className="bg-card border-border shadow-xs flex flex-col justify-between">
      <CardHeader className="pb-2 border-b border-border/50">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Stage Funnel Breakdown
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 flex flex-col gap-4">
        {stageData.map((item) => {
          const config = STAGE_CONFIG[item.stage] || {
            label: item.stage,
            badgeBg: "bg-muted text-muted-foreground",
            barBg: "bg-primary",
          }
          const percentage = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0

          return (
            <div key={item.stage} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-semibold ${config.badgeBg}`}>
                    {config.label}
                  </Badge>
                  <span className="text-muted-foreground text-[11px] font-medium">
                    ({item.count} {item.count === 1 ? "deal" : "deals"})
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-semibold text-foreground">
                    {formatMoneyMinor(item.value, "USD", "en-US")}
                  </span>
                  <span className="text-[11px] text-muted-foreground w-8 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>

              {/* Progress fill bar */}
              <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${config.barBg}`}
                  style={{ width: `${Math.max(percentage, item.count > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
