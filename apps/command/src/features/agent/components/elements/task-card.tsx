import {
  Task,
  TaskContent,
  TaskItem,
  TaskItemFile,
  type TaskStatus,
  TaskTrigger,
} from "@workspace/ui/components/task"
import type React from "react"

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

export const TaskCard: React.FC<TaskCardProps> = ({
  title,
  items,
  status = "completed",
  defaultOpen = true,
  className,
}) => {
  const completedCount =
    items?.filter((i) => i.status === "completed").length ?? 0
  const totalCount = items?.length ?? 0

  return (
    <Task defaultOpen={defaultOpen} className={className}>
      <TaskTrigger
        title={title}
        status={status}
        count={
          totalCount > 0
            ? { completed: completedCount, total: totalCount }
            : undefined
        }
      />
      {items && items.length > 0 && (
        <TaskContent>
          {items.map((item, idx) => (
            <TaskItem
              key={item.id ?? `${item.text}-${idx}`}
              status={item.status || "completed"}
            >
              <span className="inline-flex items-center gap-1.5">
                <span>{item.text}</span>
                {item.file && (
                  <TaskItemFile icon={item.file.icon}>
                    {item.file.name}
                  </TaskItemFile>
                )}
              </span>
            </TaskItem>
          ))}
        </TaskContent>
      )}
    </Task>
  )
}
