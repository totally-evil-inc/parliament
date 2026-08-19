import { Skeleton } from "@workspace/ui/components/skeleton"
import type React from "react"

export const HistorySkeleton: React.FC = () => {
  return (
    <div className="space-y-3 px-1 py-2">
      <div className="space-y-1">
        <Skeleton className="h-3 w-16 bg-sidebar-accent/60" />
      </div>
      <div className="space-y-1.5">
        {[85, 65, 92, 50, 75].map((widthPct, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-1.5 rounded-lg border border-transparent p-2"
          >
            <Skeleton
              className="h-3.5 bg-sidebar-accent/60"
              style={{ width: `${widthPct}%` }}
            />
            <div className="flex gap-2">
              <Skeleton className="h-2.5 w-12 bg-sidebar-accent/40" />
              <Skeleton className="h-2.5 w-10 bg-sidebar-accent/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
