import { formatMoneyMinor } from "@workspace/document/calculate"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Bar,
  BarChart,
  Cell,
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  XAxis,
  YAxis,
} from "@workspace/ui/components/chart"

type Props = {
  monthlyData: Array<{
    monthKey: string
    month: string
    value: number
    count: number
    isCurrent: boolean
  }>
}

const chartConfig = {
  value: {
    label: "Pipeline Value",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function DealPipelineChart({ monthlyData }: Props) {
  const currentMonthData = monthlyData.find((d) => d.isCurrent) || monthlyData[monthlyData.length - 1]
  const currentTotal = currentMonthData ? currentMonthData.value : 0

  return (
    <Card className="bg-card border-border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Sales Pipeline Volume
          </span>
          <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
            {formatMoneyMinor(currentTotal, "USD", "en-US")}
          </CardTitle>
          <span className="text-xs text-muted-foreground">Current month deal volume</span>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              className="text-[11px] font-medium text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${Math.round(val / 100000)}k`}
              className="text-[11px] font-mono text-muted-foreground"
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const data = payload[0].payload
                return (
                  <div className="p-2.5 rounded-lg bg-popover border border-border shadow-md text-xs flex flex-col gap-1">
                    <span className="font-semibold text-popover-foreground">{data.month} Pipeline</span>
                    <span className="font-mono font-bold text-primary">
                      {formatMoneyMinor(data.value, "USD", "en-US")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{data.count} deals created</span>
                  </div>
                )
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {monthlyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isCurrent ? "var(--primary)" : "hsl(var(--muted-foreground) / 0.25)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
