import {
  Task,
  TaskContent,
  TaskItem,
  TaskItemFile,
  type TaskStatus,
  TaskTrigger,
} from "@workspace/ui/components/task"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useMemo } from "react"

export interface TaskItemData {
  id?: string
  text: string
  status?: TaskStatus
  file?: {
    name: string
    icon?: React.ReactNode
  }
}

export interface TaskCardProps {
  title: string
  items?: TaskItemData[]
  status?: TaskStatus
  defaultOpen?: boolean
  className?: string
}

/**
 * Derives the aggregate task status truth from the list of task items:
 * - If any item has errored -> 'error'
 * - If any item is currently executing -> 'in_progress'
 * - If all items are completed (and non-empty) -> 'completed'
 * - If all items are pending -> 'pending'
 * - Otherwise falls back to explicitStatus or 'pending'
 */
export function deriveAggregateTaskStatus(
  explicitStatus?: TaskStatus,
  items?: TaskItemData[]
): TaskStatus {
  if (!items || items.length === 0) {
    return explicitStatus || "pending"
  }

  const hasError = items.some((i) => i.status === "error")
  if (hasError) return "error"

  const hasInProgress = items.some((i) => i.status === "in_progress")
  if (hasInProgress) return "in_progress"

  const completedCount = items.filter((i) => i.status === "completed").length
  if (completedCount === items.length && items.length > 0) return "completed"

  const pendingCount = items.filter(
    (i) => !i.status || i.status === "pending"
  ).length
  if (pendingCount === items.length) return "pending"

  return explicitStatus || (completedCount > 0 ? "in_progress" : "pending")
}

export const TaskCard: React.FC<TaskCardProps> = ({
  title,
  items,
  status: explicitStatus,
  defaultOpen,
  className,
}) => {
  const safeItems = useMemo(() => items || [], [items])
  const completedCount = useMemo(
    () => safeItems.filter((i) => i.status === "completed").length,
    [safeItems]
  )
  const totalCount = safeItems.length

  const aggregateStatus = useMemo(
    () => deriveAggregateTaskStatus(explicitStatus, safeItems),
    [explicitStatus, safeItems]
  )

  // Keep open while in_progress or error, collapse when completed unless overridden
  const computedDefaultOpen =
    defaultOpen !== undefined
      ? defaultOpen
      : aggregateStatus === "in_progress" || aggregateStatus === "error"

  return (
    <Task
      status={aggregateStatus}
      defaultOpen={computedDefaultOpen}
      className={cn("my-1.5", className)}
    >
      <TaskTrigger
        title={title}
        status={aggregateStatus}
        count={
          totalCount > 0
            ? { completed: completedCount, total: totalCount }
            : undefined
        }
      />
      {safeItems.length > 0 && (
        <TaskContent>
          {safeItems.map((item, idx) => {
            const itemKey = item.id || `task-${item.text.slice(0, 20)}-${idx}`
            const itemStatus = item.status || "pending"
            return (
              <TaskItem key={itemKey} status={itemStatus}>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={
                      itemStatus === "completed"
                        ? "text-muted-foreground line-through opacity-80"
                        : "text-foreground"
                    }
                  >
                    {item.text}
                  </span>
                  {item.file && (
                    <TaskItemFile icon={item.file.icon}>
                      {item.file.name}
                    </TaskItemFile>
                  )}
                </span>
              </TaskItem>
            )
          })}
        </TaskContent>
      )}
    </Task>
  )
}
