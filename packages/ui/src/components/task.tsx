import {
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentIcon,
  ExclamationCircleIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline"
import type React from "react"
import { createContext, useContext, useState } from "react"
import { cn } from "../lib/utils"
import { Badge } from "./badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible"

interface TaskContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const TaskContext = createContext<TaskContextValue | null>(null)

export function useTask() {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error("useTask must be used within a <Task /> component")
  }
  return context
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "error"

export interface TaskProps extends React.ComponentProps<typeof Collapsible> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  status?: TaskStatus
  className?: string
}

export function Task({
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  className,
  children,
  ...props
}: TaskProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  return (
    <TaskContext.Provider
      value={{
        isOpen,
        setIsOpen: handleOpenChange,
      }}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={handleOpenChange}
        className={cn("not-prose my-2 w-full space-y-1.5", className)}
        {...props}
      >
        {children}
      </Collapsible>
    </TaskContext.Provider>
  )
}

export interface TaskTriggerProps
  extends React.ComponentProps<typeof CollapsibleTrigger> {
  title: string
  status?: TaskStatus
  count?: { completed: number; total: number }
}

export function TaskTrigger({
  title,
  status = "completed",
  count,
  className,
  ...props
}: TaskTriggerProps) {
  const { isOpen } = useTask()

  const renderStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="size-4 text-emerald-500" />
      case "in_progress":
        return (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
        )
      case "error":
        return <ExclamationCircleIcon className="size-4 text-destructive" />
      default:
        return <ListBulletIcon className="size-4 text-muted-foreground/60" />
    }
  }

  return (
    <CollapsibleTrigger
      data-slot="task-trigger"
      className={cn(
        "group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/40 px-3.5 py-2 text-left font-mono text-muted-foreground text-xs transition-all hover:bg-muted/70 hover:text-foreground",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 truncate">
        {renderStatusIcon()}
        <span className="truncate font-semibold text-foreground text-xs">
          {title}
        </span>
        {count && (
          <Badge
            variant="outline"
            className="ml-1.5 h-4 px-1.5 font-mono text-[9px] text-muted-foreground"
          >
            {`${count.completed}/${count.total}`}
          </Badge>
        )}
      </div>
      <ChevronDownIcon
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </CollapsibleTrigger>
  )
}

export function TaskContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="task-content"
      className={cn(
        "mt-1.5 ml-3 space-y-2 border-border/80 border-l-2 py-1 pl-3.5 text-xs transition-all",
        className
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  )
}

export interface TaskItemProps extends React.ComponentPropsWithoutRef<"div"> {
  status?: TaskStatus
}

export function TaskItem({
  status,
  className,
  children,
  ...props
}: TaskItemProps) {
  return (
    <div
      data-slot="task-item"
      className={cn(
        "flex items-center gap-2 font-mono text-muted-foreground text-xs leading-relaxed",
        className
      )}
      {...props}
    >
      {status === "completed" ? (
        <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
      ) : status === "in_progress" ? (
        <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
      ) : status === "error" ? (
        <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
      )}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

export interface TaskItemFileProps
  extends React.ComponentPropsWithoutRef<"span"> {
  icon?: React.ReactNode
}

export function TaskItemFile({
  icon,
  className,
  children,
  ...props
}: TaskItemFileProps) {
  return (
    <span
      data-slot="task-item-file"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-secondary/80 px-2 py-0.5 font-mono text-[11px] text-foreground shadow-2xs",
        className
      )}
      {...props}
    >
      {icon ?? (
        <DocumentIcon className="size-3 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{children}</span>
    </span>
  )
}
