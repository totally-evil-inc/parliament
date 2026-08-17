import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  ExclamationCircleIcon,
  NoSymbolIcon,
  ShieldExclamationIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline"
import type React from "react"
import { createContext, isValidElement, useContext, useState } from "react"
import { cn } from "../lib/utils"
import { Badge } from "./badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible"
import { ScrollArea } from "./scroll-area"

export type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied"
  | "completed"
  | "running"
  | "pending"
  | "error"
  | "awaiting-approval"
  | "approved"
  | "rejected"

interface ToolContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const ToolContext = createContext<ToolContextValue | null>(null)

export function useTool() {
  const context = useContext(ToolContext)
  if (!context) {
    throw new Error("useTool must be used within a <Tool /> component")
  }
  return context
}

export function getStatusBadge(state: ToolState): React.ReactNode {
  switch (state) {
    case "input-streaming":
    case "pending":
      return (
        <Badge
          variant="secondary"
          className="gap-1 rounded-full border-border/80 px-2 py-0.5 font-normal text-[10px] text-muted-foreground"
        >
          <ClockIcon className="size-3 shrink-0" />
          <span>Pending</span>
        </Badge>
      )
    case "input-available":
    case "running":
      return (
        <Badge
          variant="secondary"
          className="gap-1 rounded-full border-border/80 px-2 py-0.5 font-normal text-[10px] text-amber-600 dark:text-amber-400"
        >
          <ArrowPathIcon className="size-3 shrink-0 animate-spin" />
          <span>Running</span>
        </Badge>
      )
    case "approval-requested":
    case "awaiting-approval":
      return (
        <Badge
          variant="secondary"
          className="gap-1 rounded-full border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-medium text-[10px] text-amber-700 dark:text-amber-300"
        >
          <ShieldExclamationIcon className="size-3 shrink-0 text-amber-500" />
          <span>Awaiting Approval</span>
        </Badge>
      )
    case "approval-responded":
    case "approved":
      return (
        <Badge
          variant="secondary"
          className="gap-1 rounded-full border-blue-500/40 bg-blue-500/10 px-2 py-0.5 font-medium text-[10px] text-blue-700 dark:text-blue-300"
        >
          <CheckCircleIcon className="size-3 shrink-0 text-blue-500" />
          <span>Approved</span>
        </Badge>
      )
    case "output-error":
    case "error":
      return (
        <Badge
          variant="destructive"
          className="gap-1 rounded-full px-2 py-0.5 font-medium text-[10px]"
        >
          <ExclamationCircleIcon className="size-3 shrink-0" />
          <span>Error</span>
        </Badge>
      )
    case "output-denied":
    case "rejected":
      return (
        <Badge
          variant="secondary"
          className="gap-1 rounded-full border-destructive/40 bg-destructive/10 px-2 py-0.5 font-medium text-[10px] text-destructive"
        >
          <NoSymbolIcon className="size-3 shrink-0" />
          <span>Denied</span>
        </Badge>
      )
    default:
      return (
        <Badge
          variant="secondary"
          className="gap-1 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-normal text-[10px] text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircleIcon className="size-3 shrink-0 text-emerald-500" />
          <span>Completed</span>
        </Badge>
      )
  }
}

export interface ToolProps extends React.ComponentProps<typeof Collapsible> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function Tool({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: ToolProps) {
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
    <ToolContext.Provider
      value={{
        isOpen,
        setIsOpen: handleOpenChange,
      }}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={handleOpenChange}
        className={cn(
          "group not-prose my-2 w-full max-w-full overflow-hidden rounded-xl border border-border/80 bg-card text-xs shadow-xs transition-all",
          className
        )}
        {...props}
      >
        {children}
      </Collapsible>
    </ToolContext.Provider>
  )
}

export interface ToolHeaderProps
  extends Omit<React.ComponentProps<typeof CollapsibleTrigger>, "type"> {
  type: string
  state: ToolState
  toolName?: string
  title?: string
}

export function ToolHeader({
  type,
  state,
  toolName,
  title,
  className,
  ...props
}: ToolHeaderProps) {
  const { isOpen } = useTool()

  const displayName =
    title ||
    toolName ||
    type
      .replace(/^tool-/, "")
      .replace(/_/g, " ")
      .replace(/^./, (c) => c.toUpperCase())

  return (
    <CollapsibleTrigger
      data-slot="tool-header"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 p-3 text-left font-mono transition-colors hover:bg-muted/40",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <WrenchScrewdriverIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-semibold text-foreground text-xs">
          {displayName}
        </span>
        <div className="shrink-0">{getStatusBadge(state)}</div>
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

export function ToolContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="tool-content"
      className={cn(
        "max-w-full space-y-3 overflow-hidden border-border/60 border-t bg-muted/20 p-3.5 text-xs transition-all",
        className
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  )
}

export interface ToolInputProps extends React.ComponentPropsWithoutRef<"div"> {
  input: Record<string, unknown> | unknown
}

export function ToolInput({ input, className, ...props }: ToolInputProps) {
  if (
    !input ||
    (typeof input === "object" && Object.keys(input as object).length === 0)
  ) {
    return null
  }

  const jsonString =
    typeof input === "string" ? input : JSON.stringify(input, null, 2)

  return (
    <div
      data-slot="tool-input"
      className={cn("max-w-full space-y-1.5 overflow-hidden", className)}
      {...props}
    >
      <h4 className="font-medium font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
        Parameters
      </h4>
      <ScrollArea className="max-h-56 max-w-full rounded-lg border border-border/80 bg-background/80 p-2.5 font-mono text-[11px]">
        <pre className="whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">
          {jsonString}
        </pre>
      </ScrollArea>
    </div>
  )
}

export interface ToolOutputProps extends React.ComponentPropsWithoutRef<"div"> {
  output?: React.ReactNode | unknown
  errorText?: string
}

export function ToolOutput({
  output,
  errorText,
  className,
  children,
  ...props
}: ToolOutputProps) {
  if (!output && !errorText && !children) return null

  return (
    <div
      data-slot="tool-output"
      className={cn("max-w-full space-y-1.5 overflow-hidden", className)}
      {...props}
    >
      <h4 className="font-medium font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
        {errorText ? "Error Output" : "Result"}
      </h4>

      {errorText ? (
        <ScrollArea className="max-h-64 max-w-full break-words rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 font-mono text-[11px] text-destructive">
          {errorText}
        </ScrollArea>
      ) : output !== undefined ? (
        typeof output === "string" ? (
          <ScrollArea className="max-h-80 max-w-full whitespace-pre-wrap break-words rounded-lg border border-border/80 bg-background/80 p-2.5 font-mono text-[11px] text-foreground/90">
            {output}
          </ScrollArea>
        ) : typeof output === "object" &&
          output !== null &&
          !isValidElement(output) ? (
          <ScrollArea className="max-h-80 max-w-full rounded-lg border border-border/80 bg-background/80 p-2.5 font-mono text-[11px]">
            <pre className="whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">
              {JSON.stringify(output, null, 2)}
            </pre>
          </ScrollArea>
        ) : (
          <ScrollArea className="max-h-80 max-w-full break-words rounded-lg border border-border/80 bg-background/80 p-2.5 text-[11px] text-foreground/90">
            {output as React.ReactNode}
          </ScrollArea>
        )
      ) : (
        children
      )}
    </div>
  )
}
