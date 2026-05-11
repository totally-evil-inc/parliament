import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"

type WorkspaceStatProps = {
  label: string
  value: string
  detail: string
  icon: IconSvgElement
}

export function WorkspaceStat({
  label,
  value,
  detail,
  icon,
}: WorkspaceStatProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
          {label}
        </div>
        <HugeiconsIcon
          icon={icon}
          strokeWidth={2}
          className="size-4 text-muted-foreground"
        />
      </div>
      <div className="mt-4 text-2xl font-medium">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  )
}
