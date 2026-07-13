import type React from "react"

type MetricCardProps = {
  label: string
  value: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
}

export function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
          {label}
        </div>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-4 text-2xl font-medium">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  )
}
