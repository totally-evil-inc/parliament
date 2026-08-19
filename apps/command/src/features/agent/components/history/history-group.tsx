import type React from "react"

interface HistoryGroupProps {
  label: string
  count?: number
  children: React.ReactNode
}

export const HistoryGroup: React.FC<HistoryGroupProps> = ({
  label,
  count,
  children,
}) => {
  return (
    <div className="space-y-1 py-1">
      <div className="flex items-center justify-between px-2 py-0.5">
        <h4 className="font-semibold text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
          {label}
        </h4>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] text-sidebar-foreground/40 tabular-nums">
            {count}
          </span>
        )}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
